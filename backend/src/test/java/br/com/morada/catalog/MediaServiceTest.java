package br.com.morada.catalog;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;

class MediaServiceTest {
    private static byte[] encode(BufferedImage image, String format) throws IOException {
        var out=new ByteArrayOutputStream();
        ImageIO.write(image,format,out);
        return out.toByteArray();
    }
    @ParameterizedTest
    @CsvSource({"800,2400", "6000,300", "321,321", "19,37", "1,5000", "5000,1"})
    void resizePreservesAspectRatioWithoutUpscaling(int w,int h) throws IOException {
        var image=new BufferedImage(w,h,BufferedImage.TYPE_INT_RGB);
        byte[] bytes=encode(image,"png");
        var files=MediaService.optimize(new MockMultipartFile("file","test.png","image/png",bytes));
        int i=0;
        for (byte[] output:new byte[][]{files.full(),files.thumbnail()}) {
            int max=i++==0?1920:480;
            var actual=ImageIO.read(new ByteArrayInputStream(output));
            double scale=Math.min(1,(double)max/Math.max(w,h));
            assertEquals(Math.max(1,Math.round(w*scale)),actual.getWidth());
            assertEquals(Math.max(1,Math.round(h*scale)),actual.getHeight());
        }
    }
    @ParameterizedTest
    @CsvSource({"1,0,1,2,3", "2,1,0,3,2", "3,3,2,1,0", "4,2,3,0,1",
        "5,0,2,1,3", "6,2,0,3,1", "7,3,1,2,0", "8,1,3,0,2"})
    void allExifOrientationsPreserveCorners(int orientation,int tl,int tr,int bl,int br) {
        var image=new BufferedImage(60,40,BufferedImage.TYPE_INT_RGB);
        int[] colors={Color.RED.getRGB(),Color.GREEN.getRGB(),Color.BLUE.getRGB(),Color.YELLOW.getRGB()};
        for (int y=0;y<40;y++) for (int x=0;x<60;x++) image.setRGB(x,y,colors[(y<20?0:2)+(x<30?0:1)]);
        var actual=MediaService.orient(image,orientation);
        assertEquals(orientation>=5?40:60,actual.getWidth());
        assertEquals(orientation>=5?60:40,actual.getHeight());
        int w=actual.getWidth(),h=actual.getHeight();
        assertArrayEquals(new int[]{colors[tl],colors[tr],colors[bl],colors[br]},
            new int[]{actual.getRGB(0,0),actual.getRGB(w-1,0),actual.getRGB(0,h-1),actual.getRGB(w-1,h-1)});
    }
    @Test
    void jpegExifIsAppliedBeforeGeneratingBothSizes() throws IOException {
        byte[] jpeg=encode(new BufferedImage(1200,600,BufferedImage.TYPE_INT_RGB),"jpg");
        var out=new ByteArrayOutputStream();
        out.write(jpeg,0,2);
        // JPEG APP1 with little-endian TIFF IFD0 orientation=6 (90 degrees clockwise).
        out.write(new byte[]{(byte)0xff,(byte)0xe1,0,34,69,120,105,102,0,0,
            73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0});
        out.write(jpeg,2,jpeg.length-2);
        var files=MediaService.optimize(new MockMultipartFile("file","phone.jpg","image/jpeg",out.toByteArray()));
        var full=ImageIO.read(new ByteArrayInputStream(files.full()));
        var thumb=ImageIO.read(new ByteArrayInputStream(files.thumbnail()));
        assertEquals(600,full.getWidth()); assertEquals(1200,full.getHeight());
        assertEquals(240,thumb.getWidth()); assertEquals(480,thumb.getHeight());
    }
    @Test
    void transparentPngGetsWhiteBackground() throws IOException {
        var bytes=encode(new BufferedImage(10,20,BufferedImage.TYPE_INT_ARGB),"png");
        var files=MediaService.optimize(new MockMultipartFile("file","transparent.png","image/png",bytes));
        assertEquals(Color.WHITE.getRGB(),ImageIO.read(new ByteArrayInputStream(files.full())).getRGB(5,5));
    }
}
