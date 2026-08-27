package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/baha998/Project_Hub/internal/domain"
)

type FileRepository struct {
	pool *pgxpool.Pool
}

func NewFileRepository(pool *pgxpool.Pool) *FileRepository {
	return &FileRepository{pool: pool}
}

var _ domain.FileRepository = (*FileRepository)(nil)

func (r *FileRepository) Create(ctx context.Context, file *domain.MediaFile) error {
	const query = `
		INSERT INTO media_files (project_id, file_name, file_path, file_size, mime_type, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`
	err := r.pool.QueryRow(ctx, query,
		file.ProjectID, file.FileName, file.FilePath, file.FileSize, file.MimeType, file.UploadedBy,
	).Scan(&file.ID, &file.CreatedAt)
	if err != nil {
		return fmt.Errorf("creating media file: %w", err)
	}
	return nil
}

func (r *FileRepository) GetByID(ctx context.Context, id string) (*domain.MediaFile, error) {
	const query = `
		SELECT id, project_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at
		FROM media_files WHERE id = $1`
	var f domain.MediaFile
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.ProjectID, &f.FileName, &f.FilePath, &f.FileSize, &f.MimeType, &f.UploadedBy, &f.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("getting media file by id: %w", err)
	}
	return &f, nil
}

func (r *FileRepository) Update(ctx context.Context, file *domain.MediaFile) error {
	const query = `
		UPDATE media_files
		SET file_name = $1, file_path = $2, file_size = $3, mime_type = $4
		WHERE id = $5`
	tag, err := r.pool.Exec(ctx, query, file.FileName, file.FilePath, file.FileSize, file.MimeType, file.ID)
	if err != nil {
		return fmt.Errorf("updating media file: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *FileRepository) Delete(ctx context.Context, id string) error {
	const query = `DELETE FROM media_files WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("deleting media file: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *FileRepository) ListByProject(ctx context.Context, projectID string) ([]*domain.MediaFile, error) {
	const query = `
		SELECT id, project_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at
		FROM media_files
		WHERE project_id = $1
		ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("listing media files: %w", err)
	}
	defer rows.Close()

	files := []*domain.MediaFile{}
	for rows.Next() {
		var f domain.MediaFile
		if err := rows.Scan(&f.ID, &f.ProjectID, &f.FileName, &f.FilePath, &f.FileSize, &f.MimeType, &f.UploadedBy, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning media file: %w", err)
		}
		files = append(files, &f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating media files: %w", err)
	}
	return files, nil
}
