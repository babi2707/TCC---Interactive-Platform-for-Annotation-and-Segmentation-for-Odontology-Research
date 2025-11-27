import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../api.services';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileSymbol } from "../profile-symbol/profile-symbol";
import { ClickOutsideDirective } from '../app.clickoutside';

@Component({
  selector: 'app-images-list',
  standalone: true,
  imports: [CommonModule, MatDividerModule, ProfileSymbol, ClickOutsideDirective],
  templateUrl: './images-list.html',
  styleUrls: ['./images-list.scss'],
})
export class ImagesList implements OnInit {
  images: any[] = [];
  databaseId!: number;
  databaseName: string = '';
  isLoading = true;
  openDropdowns: Record<string, boolean> = {};
  showConfirmModal = false;
  databaseToDelete: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const newId = params.get('databaseId');
      if (newId) {
        this.databaseId = Number(newId);

        if (isPlatformBrowser(this.platformId)) {
          this.databaseName =
            localStorage.getItem('selectedDatabaseName') || '';
        }

        this.loadImages();
      }
    });
  }

  loadImages() {
    this.isLoading = true;
    this.apiService.findAllImagesByDatabase(this.databaseId).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.images = data;
        } else if (data && typeof data === 'object') {
          this.images =
            Object.values(data).find((val) => Array.isArray(val)) || [];
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.isLoading = false;
      },
    });
  }

  getImageUrl(filePath: string): string {
    if (!filePath) return '';
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `http://localhost:8080/${
      normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath
    }`;
  }

  getImageItemClasses(img: any): string {
    const classes = ['image-item'];

    if (img.edited) {
      classes.push('edited');
    }

    return classes.join(' ');
  }

  getImageStatusText(img: any): string {
    return img.edited ? 'Image Edited' : 'Not edited';
  }

  onImageError(event: any, img: any) {
    console.error('❌ Image load error:', img.file_path);
    event.target.style.display = 'none';
  }

  onImageLoad(event: any, img: any) {
    console.log('✅ Image loaded successfully:', img.file_path);
  }

  navigateToHomepage(imageId: number) {
    this.router.navigate(['/homepage', imageId]);
  }

  toggleDatabaseDropdown(key: string | number, event: MouseEvent) {
    event.stopPropagation();
    this.openDropdowns[key] = !this.openDropdowns[key];
  }

  closeDatabaseDropdown(key: string | number) {
    this.openDropdowns[key] = false;
  }

  navigateToDatabaseEdit(databaseId: number, event: MouseEvent) {
    event.stopPropagation();
    this.router.navigate(['/edit-database', databaseId]);
  }

  openDeleteConfirmation(databaseId: number, event: MouseEvent) {
    event.stopPropagation();
    this.databaseToDelete = databaseId;
    this.showConfirmModal = true;
  }
}
