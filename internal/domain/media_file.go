package domain

import (
	"context"
	"time"
)

type MediaFile struct {
	ID         string    `json:"id" db:"id"`
	ProjectID  string    `json:"projectId" db:"project_id"`
	FileName   string    `json:"fileName" db:"file_name"`
	FilePath   string    `json:"filePath" db:"file_path"`
	FileSize   int64     `json:"fileSize" db:"file_size"`
	MimeType   string    `json:"mimeType" db:"mime_type"`
	UploadedBy string    `json:"uploadedBy" db:"uploaded_by"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
}

type FileRepository interface {
	Create(ctx context.Context, file *MediaFile) error
	GetByID(ctx context.Context, id string) (*MediaFile, error)
	Update(ctx context.Context, file *MediaFile) error
	Delete(ctx context.Context, id string) error
	ListByProject(ctx context.Context, projectID string) ([]*MediaFile, error)
}
