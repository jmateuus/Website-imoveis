package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import java.math.BigDecimal;
import java.io.*;
import java.nio.file.*;

@Component @ConditionalOnProperty(name="app.demo-data",havingValue="true")
class DemoData implements ApplicationRunner {
    private final PropertyRepository properties;
    private final CatalogService catalog;
    private final MediaService media;
    DemoData(PropertyRepository properties,CatalogService catalog,MediaService media) { this.properties=properties;this.catalog=catalog;this.media=media; }
    @Override @Transactional public void run(ApplicationArguments args) throws Exception {
        if (properties.count()!=0) return;
        String[][] examples={
            {"Casa para uma temporada em Casa Forte","CASA","4200","160","3","2","2","Casa Forte","Recife","casa.png"},
            {"Apartamento para dias leves em Boa Viagem","APARTAMENTO","2800","78","2","2","1","Boa Viagem","Recife","apartamento.png"},
            {"Refúgio com varanda em Bairro Novo","CASA","1850","95","2","1","1","Bairro Novo","Olinda","compacta.png"},
            {"Uma estadia especial em Boa Viagem","APARTAMENTO","3200","92","3","2","1","Boa Viagem","Recife","apartamento.png"},
            {"Casa para descansar em Piedade","SOBRADO","3600","145","3","3","2","Piedade","Jaboatão dos Guararapes","casa.png"},
            {"Dias de descanso em Olinda","CASA","1600","70","2","1","1","Jardim Atlântico","Olinda","compacta.png"}
        };
        for (int i=0;i<examples.length;i++) {
            var e=examples[i];
            var p=catalog.save(null,new PropertyInput(e[0],CatalogService.slugify(e[0]),
                "Hospedagem demonstrativa, com imagem ilustrativa gerada para apresentação do catálogo. Não representa uma oferta real.\n\nUm espaço acolhedor para uma estadia com conforto, momentos em família e uma pausa na rotina. Conheça os ambientes e as comodidades e consulte o período da sua viagem pelo WhatsApp.",
                PropertyType.valueOf(e[1]),new BigDecimal(e[2]),i%2==0?null:new BigDecimal("450.00"),new BigDecimal("120.00"),new BigDecimal(e[3]),
                Integer.valueOf(e[4]),1,Integer.valueOf(e[5]),Integer.valueOf(e[6]),Integer.valueOf(e[4])*2,e[8],"PE",e[7],null,false,i%2==1,true,i<3,
                PropertyStatus.DISPONIVEL,Set.of(UUID.fromString("10000000-0000-0000-0000-000000000001"),UUID.fromString("10000000-0000-0000-0000-000000000006"))));
            var resource=new ClassPathResource("demo/"+e[9]);
            if(resource.exists()) media.upload(p.id(),new DemoFile(e[9],resource.getContentAsByteArray()));
        }
    }
    private record DemoFile(String filename,byte[] bytes) implements MultipartFile {
        public String getName(){return "file";}
        public String getOriginalFilename(){return filename;}
        public String getContentType(){return "image/png";}
        public boolean isEmpty(){return bytes.length==0;}
        public long getSize(){return bytes.length;}
        public byte[] getBytes(){return bytes;}
        public InputStream getInputStream(){return new ByteArrayInputStream(bytes);}
        public void transferTo(File file) throws IOException {Files.write(file.toPath(),bytes);}
    }
}
