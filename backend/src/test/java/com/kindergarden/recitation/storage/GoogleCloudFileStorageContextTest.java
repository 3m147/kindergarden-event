package com.kindergarden.recitation.storage;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleCloudFileStorageContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withPropertyValues(
                    "spring.profiles.active=gcp",
                    "app.storage.bucket=test-private-bucket"
            )
            .withUserConfiguration(GoogleCloudFileStorage.class);

    @Test
    void createsStorageBeanWhenGcpProfileIsActive() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(GoogleCloudFileStorage.class);
        });
    }
}
