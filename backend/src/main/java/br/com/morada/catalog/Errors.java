package br.com.morada.catalog;

import static br.com.morada.catalog.Dtos.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import software.amazon.awssdk.core.exception.SdkException;
import java.util.*;

@RestControllerAdvice
class Errors {
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<ErrorView> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(new ErrorView(e.getReason(),Map.of()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ErrorView> invalid(MethodArgumentNotValidException e) {
        var fields=new LinkedHashMap<String,String>();
        e.getBindingResult().getFieldErrors().forEach(err->fields.putIfAbsent(err.getField(),err.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ErrorView("Confira os campos destacados.",fields));
    }
    @ExceptionHandler(AuthenticationException.class) ResponseEntity<ErrorView> auth() { return ResponseEntity.status(401).body(new ErrorView("E-mail ou senha incorretos.",Map.of())); }
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ErrorView> conflict() { return ResponseEntity.status(409).body(new ErrorView("Os dados conflitam com um registro existente. Atualize e tente novamente.",Map.of())); }
    @ExceptionHandler(MaxUploadSizeExceededException.class) ResponseEntity<ErrorView> upload() { return ResponseEntity.status(413).body(new ErrorView("Arquivo excede o limite permitido.",Map.of())); }
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class}) ResponseEntity<ErrorView> format() { return ResponseEntity.badRequest().body(new ErrorView("Formato dos dados inválido.",Map.of())); }
    @ExceptionHandler(SdkException.class) ResponseEntity<ErrorView> storage() { return ResponseEntity.status(503).body(new ErrorView("Armazenamento temporariamente indisponível. Tente novamente.",Map.of())); }
}
