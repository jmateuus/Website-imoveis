package br.com.morada.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.*;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import org.springframework.http.*;
import org.springframework.core.io.InputStreamResource;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.nio.file.*;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.slf4j.LoggerFactory;
import jakarta.annotation.PreDestroy;

@Service
class StorageService {
    private final S3Client s3;
    private final String bucket;
    private final DeletionRepository deletions;
    StorageService(@Value("${app.storage.endpoint}") String endpoint, @Value("${app.storage.region}") String region,
        @Value("${app.storage.bucket}") String bucket, @Value("${app.storage.access-key}") String accessKey,
        @Value("${app.storage.secret-key}") String secretKey, @Value("${app.storage.create-bucket}") boolean create,
        DeletionRepository deletions) {
        this.bucket=bucket;this.deletions=deletions;
        s3=S3Client.builder().endpointOverride(URI.create(endpoint)).region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey,secretKey)))
            .forcePathStyle(true).httpClientBuilder(UrlConnectionHttpClient.builder()).build();
        if (create) {
            try { s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build()); }
            catch (S3Exception e) { if (e.statusCode()!=404) throw e; s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build()); }
        }
    }
    void put(String key, String type, byte[] bytes) {
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(type).build(),RequestBody.fromBytes(bytes));
    }
    void put(String key, String type, Path path) {
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(type).build(),RequestBody.fromFile(path));
    }
    void delete(String key) { s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build()); }
    ResponseEntity<InputStreamResource> read(String key, String range, boolean admin) {
        var request=GetObjectRequest.builder().bucket(bucket).key(key);
        if (range!=null) {
            if (!range.matches("bytes=(\\d+-\\d*|-\\d+)")) throw new ResponseStatusException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,"Plage inválida.");
            request.range(range);
        }
        try {
            var stream=s3.getObject(request.build()); var meta=stream.response();
            var headers=new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType(meta.contentType()));
            headers.setContentLength(meta.contentLength()); headers.set("Accept-Ranges","bytes");
            headers.setCacheControl(admin?"private, no-store":"public, max-age=300");
            headers.set("Content-Disposition","inline");
            if (meta.contentRange()!=null) headers.set("Content-Range",meta.contentRange());
            return new ResponseEntity<>(new InputStreamResource(stream),headers,range==null?HttpStatus.OK:HttpStatus.PARTIAL_CONTENT);
        } catch (S3Exception e) {
            if (e.statusCode()==404) throw CatalogService.notFound();
            if (e.statusCode()==416) throw new ResponseStatusException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,"Faixa inválida.");
            throw e;
        }
    }
    @Scheduled(fixedDelay=15000) @Transactional
    public void cleanup() {
        List<PendingDeletion> batch=deletions.findAll(PageRequest.of(0,50)).getContent();
        for (var item:batch) {
            try { delete(item.key); deletions.delete(item); }
            catch (RuntimeException e) { LoggerFactory.getLogger(getClass()).warn("Exclusão de objeto pendente; será repetida."); }
        }
    }
    @PreDestroy void close() { s3.close(); }
}
