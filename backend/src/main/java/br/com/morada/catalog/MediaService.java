package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import java.util.*;
import java.util.List;
import java.io.*;
import java.nio.file.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;

@Service @Transactional
class MediaService {
    private final CatalogService catalog;
    private final MediaRepository media;
    private final StorageService storage;
    record ImageFiles(byte[] full, byte[] thumbnail) {}
    MediaService(CatalogService catalog, MediaRepository media, StorageService storage) { this.catalog=catalog;this.media=media;this.storage=storage; }
    MediaView upload(UUID propertyId, MultipartFile file) throws IOException {
        Property p=catalog.locked(propertyId);
        if (p.media.size()>=30) throw CatalogService.bad("Limite de 30 mídias por imóvel.");
        if (file.isEmpty()) throw CatalogService.bad("Arquivo vazio.");
        Media m=new Media();m.property=p;
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("arquivo").replace('\\','/');
        m.originalName=name.substring(name.lastIndexOf('/')+1);
        if (m.originalName.length()>255) m.originalName=m.originalName.substring(m.originalName.length()-255);
        m.position=p.media.stream().mapToInt(i->i.position).max().orElse(-1)+1;
        String root="imoveis/"+p.id+"/"+m.id;
        String type=Optional.ofNullable(file.getContentType()).orElse("");
        if (type.equals("image/jpeg") || type.equals("image/png")) {
            ImageFiles images=optimize(file);
            m.type=MediaType.IMAGEM; m.contentType="image/jpeg";m.key=root+".jpg";m.thumbnailKey=root+"-thumb.jpg";
            m.size=images.full().length;m.primaryImage=p.media.stream().noneMatch(i->i.primaryImage);
            storage.put(m.key,m.contentType,images.full());
            try { storage.put(m.thumbnailKey,m.contentType,images.thumbnail()); }
            catch (RuntimeException e) { storage.delete(m.key);throw e; }
        } else if (type.equals("video/mp4") || type.equals("video/webm")) {
            if (file.getSize()>100*1024*1024) throw CatalogService.bad("Vídeo deve ter até 100 MB.");
            byte[] head;
            try (InputStream in=file.getInputStream()) { head=in.readNBytes(16); }
            boolean valid=type.equals("video/mp4")?head.length>=12 && head[4]=='f' && head[5]=='t' && head[6]=='y' && head[7]=='p'
                :head.length>=4 && head[0]==0x1a && head[1]==0x45 && head[2]==(byte)0xdf && head[3]==(byte)0xa3;
            if (!valid) throw CatalogService.bad("O conteúdo do vídeo não corresponde ao formato informado.");
            m.type=MediaType.VIDEO; m.contentType=type; m.key=root+(type.equals("video/mp4")?".mp4":".webm");m.size=file.getSize();
            Path temp=Files.createTempFile("upload-",".video");
            try { file.transferTo(temp);storage.put(m.key,type,temp); }
            finally { Files.deleteIfExists(temp); }
        } else throw CatalogService.bad("Use imagens JPG/PNG (até 15 MB) ou vídeos MP4/WebM (até 100 MB).");
        try { media.saveAndFlush(m);p.media.add(m); }
        catch (RuntimeException e) { storage.delete(m.key);if(m.thumbnailKey!=null)storage.delete(m.thumbnailKey);throw e; }
        return CatalogService.mediaView(m,true);
    }
    static ImageFiles optimize(MultipartFile file) throws IOException {
        if (file.getSize()>15*1024*1024) throw CatalogService.bad("Imagem deve ter até 15 MB.");
        try (var input=ImageIO.createImageInputStream(file.getInputStream())) {
            var readers=ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw CatalogService.bad("Imagem inválida.");
            ImageReader reader=readers.next();
            try {
                reader.setInput(input,true,true);
                long pixels=(long)reader.getWidth(0)*reader.getHeight(0);
                if (pixels>40_000_000 || pixels<1) throw CatalogService.bad("Imagem excede 40 megapixels.");
                BufferedImage original=reader.read(0);
                return new ImageFiles(resize(original,1920),resize(original,480));
            } finally { reader.dispose(); }
        }
    }
    private static byte[] resize(BufferedImage image, int max) throws IOException {
        double ratio=Math.min(1,(double)max/Math.max(image.getWidth(),image.getHeight()));
        BufferedImage result=new BufferedImage(Math.max(1,(int)(image.getWidth()*ratio)),Math.max(1,(int)(image.getHeight()*ratio)),BufferedImage.TYPE_INT_RGB);
        Graphics2D g=result.createGraphics(); g.setColor(Color.WHITE);g.fillRect(0,0,result.getWidth(),result.getHeight());
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(image,0,0,result.getWidth(),result.getHeight(),null);g.dispose();
        ByteArrayOutputStream out=new ByteArrayOutputStream();ImageIO.write(result,"jpg",out);return out.toByteArray();
    }
    @Transactional(readOnly=true)
    ResponseEntity<InputStreamResource> read(UUID id, boolean admin, boolean thumbnail, String range) {
        Media m=media.findById(id).orElseThrow(CatalogService::notFound);
        if (!admin && m.property.status==PropertyStatus.RASCUNHO) throw CatalogService.notFound();
        return storage.read(thumbnail && m.thumbnailKey!=null?m.thumbnailKey:m.key,range,admin);
    }
    void delete(UUID propertyId, UUID id) {
        Property p=catalog.locked(propertyId);
        Media m=p.media.stream().filter(i->i.id.equals(id)).findFirst().orElseThrow(CatalogService::notFound);
        catalog.queueDelete(m.key);catalog.queueDelete(m.thumbnailKey);p.media.remove(m);
        media.delete(m);media.flush();
        if (m.primaryImage) p.media.stream().filter(i->i.type==MediaType.IMAGEM).findFirst().ifPresent(i->i.primaryImage=true);
    }
    void primary(UUID propertyId, UUID id) {
        Property p=catalog.locked(propertyId);
        Media selected=p.media.stream().filter(i->i.id.equals(id) && i.type==MediaType.IMAGEM).findFirst().orElseThrow(CatalogService::notFound);
        p.media.forEach(i->i.primaryImage=false);media.flush();selected.primaryImage=true;
    }
    void reorder(UUID propertyId, List<UUID> ids) {
        Property p=catalog.locked(propertyId);
        if (ids.size()!=p.media.size() || new HashSet<>(ids).size()!=ids.size()
            || !new HashSet<>(ids).equals(p.media.stream().map(i->i.id).collect(java.util.stream.Collectors.toSet())))
            throw CatalogService.bad("Informe todas as mídias, sem repetições.");
        p.media.forEach(m->m.position=ids.indexOf(m.id));
    }
}
