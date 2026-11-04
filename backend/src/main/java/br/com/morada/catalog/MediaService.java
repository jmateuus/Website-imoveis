package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import java.util.*;
import java.util.List;
import java.io.*;
import java.nio.file.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.geom.AffineTransform;
import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.exif.ExifIFD0Directory;
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
    private final ExperienceRepository experiences;
    record ImageFiles(byte[] full, byte[] thumbnail) {}
    MediaService(CatalogService catalog, MediaRepository media, StorageService storage, ExperienceRepository experiences) { this.catalog=catalog;this.media=media;this.storage=storage;this.experiences=experiences; }
    MediaView upload(UUID propertyId, MultipartFile file) throws IOException {
        Property p=catalog.locked(propertyId);
        Media m=new Media();m.property=p;
        return uploadFile(m,p.media,"imoveis/"+p.id,file);
    }
    MediaView uploadExperience(UUID id,MultipartFile file) throws IOException {
        var e=experiences.findLockedById(id).orElseThrow(CatalogService::notFound);
        Media m=new Media();m.experience=e;
        return uploadFile(m,e.media,"experiences/"+e.id,file);
    }
    private MediaView uploadFile(Media m,List<Media> siblings,String folder,MultipartFile file) throws IOException {
        if (siblings.size()>=30) throw CatalogService.bad("Limite de 30 mídias.");
        if (file.isEmpty()) throw CatalogService.bad("Arquivo vazio.");
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("arquivo").replace('\\','/');
        m.originalName=name.substring(name.lastIndexOf('/')+1);
        if (m.originalName.length()>255) m.originalName=m.originalName.substring(m.originalName.length()-255);
        m.position=siblings.stream().mapToInt(i->i.position).max().orElse(-1)+1;
        String root=folder+"/"+m.id;
        String type=Optional.ofNullable(file.getContentType()).orElse("");
        if (type.equals("image/jpeg") || type.equals("image/png")) {
            ImageFiles images=optimize(file);
            m.type=MediaType.IMAGEM; m.contentType="image/jpeg";m.key=root+".jpg";m.thumbnailKey=root+"-thumb.jpg";
            m.size=images.full().length;m.primaryImage=siblings.stream().noneMatch(i->i.primaryImage);
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
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status!=STATUS_COMMITTED) try { storage.delete(m.key);if(m.thumbnailKey!=null)storage.delete(m.thumbnailKey); }
                catch (RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(MediaService.class).warn("Falha ao limpar mídia não salva: {}",m.key); }
            }
        });
        try { media.saveAndFlush(m);siblings.add(m); }
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
                BufferedImage original=orient(reader.read(0), orientation(file));
                return new ImageFiles(resize(original,1920),resize(original,480));
            } finally { reader.dispose(); }
        }
    }
    private static int orientation(MultipartFile file) throws IOException {
        try (InputStream in=file.getInputStream()) {
            var directory=ImageMetadataReader.readMetadata(in).getFirstDirectoryOfType(ExifIFD0Directory.class);
            Integer value=directory==null?null:directory.getInteger(ExifIFD0Directory.TAG_ORIENTATION);
            return value==null?1:value;
        } catch (ImageProcessingException e) {
            // A decodable image without usable metadata retains its pixel orientation.
            return 1;
        }
    }
    static BufferedImage orient(BufferedImage image, int orientation) {
        int w=image.getWidth(), h=image.getHeight();
        AffineTransform transform=switch (orientation) {
            case 2 -> new AffineTransform(-1,0,0,1,w,0);
            case 3 -> new AffineTransform(-1,0,0,-1,w,h);
            case 4 -> new AffineTransform(1,0,0,-1,0,h);
            case 5 -> new AffineTransform(0,1,1,0,0,0);
            case 6 -> new AffineTransform(0,1,-1,0,h,0);
            case 7 -> new AffineTransform(0,-1,-1,0,h,w);
            case 8 -> new AffineTransform(0,-1,1,0,0,w);
            default -> null;
        };
        if (transform==null) return image;
        boolean swap=orientation>=5 && orientation<=8;
        BufferedImage result=new BufferedImage(swap?h:w,swap?w:h,BufferedImage.TYPE_INT_ARGB);
        Graphics2D g=result.createGraphics();
        try { g.drawImage(image,transform,null); } finally { g.dispose(); }
        return result;
    }
    private static byte[] resize(BufferedImage image, int max) throws IOException {
        double ratio=Math.min(1,(double)max/Math.max(image.getWidth(),image.getHeight()));
        BufferedImage result=new BufferedImage(Math.max(1,(int)Math.round(image.getWidth()*ratio)),Math.max(1,(int)Math.round(image.getHeight()*ratio)),BufferedImage.TYPE_INT_RGB);
        Graphics2D g=result.createGraphics(); g.setColor(Color.WHITE);g.fillRect(0,0,result.getWidth(),result.getHeight());
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(image,0,0,result.getWidth(),result.getHeight(),null);g.dispose();
        ByteArrayOutputStream out=new ByteArrayOutputStream();ImageIO.write(result,"jpg",out);return out.toByteArray();
    }
    @Transactional(readOnly=true)
    ResponseEntity<InputStreamResource> read(UUID id, boolean admin, boolean thumbnail, String range) {
        // Publication checks need initialized owner fields, not lazy proxy defaults.
        Media m=media.findWithOwnerById(id).orElseThrow(CatalogService::notFound);
        if (!admin && ((m.property!=null && m.property.status==PropertyStatus.RASCUNHO) || (m.experience!=null && !m.experience.published))) throw CatalogService.notFound();
        return storage.read(thumbnail && m.thumbnailKey!=null?m.thumbnailKey:m.key,range,admin);
    }
    void delete(UUID propertyId, UUID id) {
        Property p=catalog.locked(propertyId);
        deleteFrom(p.media,id);
    }
    void deleteExperience(UUID owner,UUID id) { deleteFrom(experiences.findLockedById(owner).orElseThrow(CatalogService::notFound).media,id); }
    private void deleteFrom(List<Media> siblings,UUID id) {
        Media m=siblings.stream().filter(i->i.id.equals(id)).findFirst().orElseThrow(CatalogService::notFound);
        catalog.queueDelete(m.key);catalog.queueDelete(m.thumbnailKey);siblings.remove(m);
        media.delete(m);media.flush();
        if (m.primaryImage) siblings.stream().filter(i->i.type==MediaType.IMAGEM).findFirst().ifPresent(i->i.primaryImage=true);
    }
    void primary(UUID propertyId, UUID id) {
        Property p=catalog.locked(propertyId);
        primaryIn(p.media,id);
    }
    void primaryExperience(UUID owner,UUID id) { primaryIn(experiences.findLockedById(owner).orElseThrow(CatalogService::notFound).media,id); }
    private void primaryIn(List<Media> siblings,UUID id) {
        Media selected=siblings.stream().filter(i->i.id.equals(id) && i.type==MediaType.IMAGEM).findFirst().orElseThrow(CatalogService::notFound);
        siblings.forEach(i->i.primaryImage=false);media.flush();selected.primaryImage=true;
    }
    void reorder(UUID propertyId, List<UUID> ids) {
        Property p=catalog.locked(propertyId);
        reorderIn(p.media,ids);
    }
    void reorderExperience(UUID owner,List<UUID> ids) { reorderIn(experiences.findLockedById(owner).orElseThrow(CatalogService::notFound).media,ids); }
    private void reorderIn(List<Media> siblings,List<UUID> ids) {
        if (ids.size()!=siblings.size() || new HashSet<>(ids).size()!=ids.size()
            || !new HashSet<>(ids).equals(siblings.stream().map(i->i.id).collect(java.util.stream.Collectors.toSet())))
            throw CatalogService.bad("Informe todas as mídias, sem repetições.");
        siblings.forEach(m->m.position=ids.indexOf(m.id));
    }
}
