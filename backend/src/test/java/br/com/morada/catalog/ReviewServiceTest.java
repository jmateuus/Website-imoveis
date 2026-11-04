package br.com.morada.catalog;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import javax.imageio.ImageIO;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;

class ReviewServiceTest {
    ReviewRepository repository=mock(ReviewRepository.class);
    StorageService storage=mock(StorageService.class);
    CatalogService catalog=mock(CatalogService.class);
    ReviewService service=new ReviewService(repository,storage,catalog);
    ReviewInput input(int rating) { return new ReviewInput(" Ana ",rating," Excelente estadia "," Casa de praia "," @ana "); }
    MockMultipartFile photo() throws IOException {
        var out=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(40,80,BufferedImage.TYPE_INT_RGB),"png",out);
        return new MockMultipartFile("file","cliente.png","image/png",out.toByteArray());
    }
    @BeforeEach void transaction() { TransactionSynchronizationManager.initSynchronization(); }
    @AfterEach void cleanup() { TransactionSynchronizationManager.clearSynchronization(); }
    @Test void createSupportsZeroStarsAndNormalizesText() throws Exception {
        var saved=service.save(null,input(0),photo());
        assertEquals(0,saved.rating()); assertEquals("Ana",saved.customerName()); assertEquals("@ana",saved.contact());
        assertTrue(saved.photoUrl().startsWith("/api/public/reviews/"));
        verify(repository).saveAndFlush(any(Review.class));
        TransactionSynchronizationManager.getSynchronizations().forEach(s->s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
        verify(storage,never()).delete(anyString());
    }
    @Test void photoIsRequiredForCreation() { assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.save(null,input(5),null)); verifyNoInteractions(storage); }
    @Test void failedDatabaseSaveCleansNewPhoto() throws Exception {
        when(repository.saveAndFlush(any())).thenThrow(new IllegalStateException("database failed"));
        assertThrows(IllegalStateException.class,()->service.save(null,input(5),photo()));
        TransactionSynchronizationManager.getSynchronizations().forEach(s->s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verify(storage).delete(startsWith("reviews/"));
    }
    @Test void replacementQueuesOnlyOldPhoto() throws Exception {
        Review review=new Review(); review.photoKey="reviews/"+UUID.randomUUID()+".jpg";
        String old=review.photoKey; when(repository.findLockedById(review.id)).thenReturn(Optional.of(review));
        service.save(review.id,input(4),photo()); verify(catalog).queueDelete(old); assertNotEquals(old,review.photoKey);
    }
    @Test void editWithoutPhotoPreservesCurrentImage() throws Exception {
        Review review=new Review(); review.photoKey="reviews/"+UUID.randomUUID()+".jpg";
        when(repository.findLockedById(review.id)).thenReturn(Optional.of(review));
        service.save(review.id,input(3),null); verifyNoInteractions(storage); verify(catalog,never()).queueDelete(anyString());
    }
    @Test void deleteQueuesPhotoAndDeletesReview() {
        Review review=new Review();review.photoKey="reviews/old.jpg";
        when(repository.findLockedById(review.id)).thenReturn(Optional.of(review));
        service.delete(review.id);verify(catalog).queueDelete(review.photoKey);verify(repository).delete(review);
    }
    @Test void listClampsPaginationAndHandlesEmptyAverage() {
        when(repository.findAll(any(Pageable.class))).thenReturn(Page.empty());
        var result=service.list(-1,10000);assertEquals(0,result.average());assertEquals(0,result.totalElements());
        verify(repository).findAll(PageRequest.of(0,50,Sort.by(Sort.Order.desc("createdAt"),Sort.Order.asc("id"))));
    }
    @Test void validatesRatingAndContactLimits() {
        try (var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();assertTrue(validator.validate(input(0)).isEmpty());assertTrue(validator.validate(input(5)).isEmpty());
            assertFalse(validator.validate(input(-1)).isEmpty());assertFalse(validator.validate(input(6)).isEmpty());
            assertFalse(validator.validate(new ReviewInput(" ",null," "," ","x".repeat(161))).isEmpty());
        }
    }
}
