package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/baha998/Project_Hub/internal/domain"
)

// FileUsecase wraps FileRepository. It only persists file metadata; moving
// the underlying bytes to storage is the handler layer's responsibility.
type FileUsecase struct {
	files domain.FileRepository
}

func NewFileUsecase(files domain.FileRepository) *FileUsecase {
	return &FileUsecase{files: files}
}

// SaveMetadata records a file already stored at filePath against a project.
func (uc *FileUsecase) SaveMetadata(ctx context.Context, projectID, fileName, filePath string, fileSize int64, mimeType, uploadedBy string) (*domain.MediaFile, error) {
	file := &domain.MediaFile{
		ProjectID:  projectID,
		FileName:   fileName,
		FilePath:   filePath,
		FileSize:   fileSize,
		MimeType:   mimeType,
		UploadedBy: uploadedBy,
	}
	if err := uc.files.Create(ctx, file); err != nil {
		return nil, fmt.Errorf("saving metadata for file %q: %w", fileName, err)
	}
	return file, nil
}

// ListByProject returns every file attached to a project.
func (uc *FileUsecase) ListByProject(ctx context.Context, projectID string) ([]*domain.MediaFile, error) {
	files, err := uc.files.ListByProject(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("listing files for project %q: %w", projectID, err)
	}
	return files, nil
}

// GetByID returns a single file's metadata.
func (uc *FileUsecase) GetByID(ctx context.Context, id string) (*domain.MediaFile, error) {
	file, err := uc.files.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("getting file %q: %w", id, err)
	}
	return file, nil
}

// Delete removes a file's metadata record and returns the deleted record,
// so the caller can also remove the underlying bytes from disk. It fails
// with ErrForbidden unless the caller uploaded the file or holds the
// LEAD/ADMIN role.
func (uc *FileUsecase) Delete(ctx context.Context, id, callerID string, callerRole domain.UserRole) (*domain.MediaFile, error) {
	file, err := uc.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	canManageAnyFile := callerRole == domain.UserRoleAdmin || callerRole == domain.UserRoleLead
	if !canManageAnyFile && file.UploadedBy != callerID {
		return nil, ErrForbidden
	}

	if err := uc.files.Delete(ctx, id); err != nil {
		return nil, fmt.Errorf("deleting file %q: %w", id, err)
	}
	return file, nil
}
