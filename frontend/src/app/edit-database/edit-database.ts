import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../api.services';
import { Router, RouterModule } from '@angular/router';

type CustomFile = File & {
  existing?: boolean;
  url?: string;
  id?: number;
  markedForRemoval?: boolean;
};

@Component({
  selector: 'app-edit-database',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './edit-database.html',
  styleUrl: './edit-database.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditDatabase {
  database: any;
  removedFilesIds: number[] = [];
  readonly name = new FormControl('');
  selectedFiles: CustomFile[] = [];

  errorMessage = signal('');
  hide = signal(true);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.database = navigation?.extras.state?.['database'];
  }

  ngOnInit() {
    if (this.database) {
      this.name.setValue(this.database.name);
      this.loadExistingImages(this.database.id);
    }
  }

  loadExistingImages(databaseId: number) {
    this.apiService.findAllImagesByDatabase(databaseId).subscribe({
      next: (images: any[]) => {
        this.selectedFiles = images.map((img: any) => {
          const fullName = img.file_path.split('\\').pop() || 'Unnamed file';
          const cleanName = fullName.includes('_')
            ? fullName.split('_').slice(1).join('_')
            : fullName;

          return {
            name: cleanName,
            url: img.file_path,
            existing: true,
            id: img.id,
          } as CustomFile;
        });

        this.cd.markForCheck();
      },
      error: (err) =>
        console.error('Erro ao carregar imagens da database:', err),
    });
  }

  markForRemoval(index: number) {
    const file = this.selectedFiles[index];

    if (file.existing) {
      file.markedForRemoval = true;
    } else {
      this.selectedFiles.splice(index, 1);
    }

    this.cd.markForCheck();
  }

  updateErrorMessage() {
    if (this.name.hasError('required')) {
      this.errorMessage.set('You must insert a valid name');
    }
  }

  openFileSelector(event: MouseEvent) {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    input?.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);

      const uniqueFiles = newFiles.filter(
        (file) => !this.selectedFiles.some((f) => f.name === file.name)
      );

      this.selectedFiles = [...this.selectedFiles, ...uniqueFiles];
    }
  }

  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  onEditDatabase() {
    if (this.name.invalid) {
      this.errorMessage.set('Please provide a valid name for the database.');
      return;
    }

    const token = localStorage.getItem('authToken');
    let userId = '';

    if (token) {
      const payload = this.parseJwt(token);
      userId = payload?.userId;
    }

    const formData = new FormData();
    formData.append('id', this.database.id.toString());
    formData.append('name', this.name.value || '');
    formData.append('userId', userId);

    this.selectedFiles
      .filter((f) => !f.existing)
      .forEach((f) => formData.append('newFiles', f));

    this.removedFilesIds = this.selectedFiles
      .filter((f) => f.markedForRemoval && f.existing && f.id !== undefined)
      .map((f) => f.id as number);

    this.removedFilesIds.forEach((id) =>
      formData.append('removedFileIds', id.toString())
    );

    this.apiService.editDatabase(formData).subscribe({
      next: () => this.router.navigate(['/database']),
      error: (err) => {
        console.error('Error editing database:', err);
        this.errorMessage.set('Failed to edit database. Please try again.');
      },
    });
  }
}
