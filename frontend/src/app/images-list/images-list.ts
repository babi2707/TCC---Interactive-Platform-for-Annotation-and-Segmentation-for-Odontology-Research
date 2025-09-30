import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-images-list',
  imports: [CommonModule],
  templateUrl: './images-list.html',
  styleUrls: ['./images-list.scss'],
})
export class ImagesList implements OnInit {
  images: any[] = [];
  databaseId!: number;
  databaseName: string = '';
  isLoading = true;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const newId = params.get('databaseId');
      if (newId) {
        this.databaseId = Number(newId);
        this.databaseName = localStorage.getItem('selectedDatabaseName') || '';
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
    return `http://localhost:8080${
      filePath.startsWith('/') ? '' : '/'
    }${filePath}`;
  }

  onImageError(event: any, img: any) {
    console.error('❌ Image load error:', img.file_path);
    event.target.style.display = 'none';
  }

  onImageLoad(event: any, img: any) {
    console.log('✅ Image loaded successfully:', img.file_path);
  }
}
