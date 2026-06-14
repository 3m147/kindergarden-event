package com.kindergarden.recitation.storage;

import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
@Profile("gcp")
public class GoogleCloudFileStorage implements PrivateFileStorage {

    private final Storage storage;
    private final String bucketName;

    @Autowired
    public GoogleCloudFileStorage(@Value("${app.storage.bucket}") String bucketName) {
        this(StorageOptions.getDefaultInstance().getService(), bucketName);
    }

    GoogleCloudFileStorage(Storage storage, String bucketName) {
        this.storage = storage;
        this.bucketName = bucketName;
    }

    @Override
    public StoredObject upload(StoredFileCategory category, MultipartFile file) {
        LocalFileStorage.validate(category, file);
        String objectKey = LocalFileStorage.createObjectKey(category, file.getOriginalFilename());
        BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, objectKey)
                .setContentType(file.getContentType())
                .build();
        try {
            storage.create(blobInfo, file.getBytes());
            return new StoredObject(
                    objectKey,
                    file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize()
            );
        } catch (IOException e) {
            throw new IllegalStateException("Cloud Storage 파일 저장 실패", e);
        }
    }

    @Override
    public URI createReadUri(String objectKey, Duration lifetime) {
        return URI.create(storage.signUrl(
                BlobInfo.newBuilder(bucketName, objectKey).build(),
                lifetime.toSeconds(),
                TimeUnit.SECONDS,
                Storage.SignUrlOption.withV4Signature()
        ).toString());
    }

    @Override
    public void delete(String objectKey) {
        storage.delete(bucketName, objectKey);
    }
}
