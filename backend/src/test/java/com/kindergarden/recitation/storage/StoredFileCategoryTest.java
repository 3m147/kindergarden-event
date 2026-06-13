package com.kindergarden.recitation.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StoredFileCategoryTest {

    @Test
    void acceptsImagesForWeeklyPhotosAndRejectsPdf() {
        assertThat(StoredFileCategory.WEEKLY_PHOTO.accepts("image/jpeg", 1024)).isTrue();
        assertThat(StoredFileCategory.WEEKLY_PHOTO.accepts("application/pdf", 1024)).isFalse();
    }

    @Test
    void acceptsPdfForFoundationAndRejectsOversizedFile() {
        assertThat(StoredFileCategory.FOUNDATION_PDF.accepts("application/pdf", 1024)).isTrue();
        assertThat(StoredFileCategory.FOUNDATION_PDF.accepts("application/pdf", 21L * 1024 * 1024)).isFalse();
    }
}
