import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';
import { ApiService } from '../api.services';
import { ColorSketchModule } from 'ngx-color/sketch';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDividerModule,
    ProfileSymbol,
    ColorSketchModule,
  ],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.scss'],
})
export class Homepage implements OnInit {
  imageId!: number;
  imageUrl: string = '';
  segmentedImageUrl: string = '';

  brushColor: string = '#ff0000';
  brushX: number = 0;
  brushY: number = 0;
  showBrush = false;
  showColorPicker = false;
  brushSize: number = 10;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('imageId');
      if (id) {
        this.imageId = Number(id);
        this.loadImage();
      }
    });
  }

  loadImage() {
    this.apiService.findImageById(this.imageId).subscribe({
      next: (data: any) => {
        this.imageUrl = `http://localhost:8080/${data.file_path}`;
      },
      error: (err) => {
        console.error('Erro ao carregar imagem:', err);
      },
    });
  }

  onMouseMove(event: MouseEvent) {
    const container = (event.currentTarget as HTMLElement).querySelector('img');
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        this.brushX = x;
        this.brushY = y;
        this.showBrush = true;
      } else {
        this.showBrush = false;
      }
    }
  }

  hideBrush() {
    this.showBrush = false;
  }

  updateBrushColor() {
    this.showColorPicker = false;
  }

  updateBrushSize(event: any) {
    this.brushSize = Number(event.target.value);
  }

  onColorChange(event: any) {
    this.brushColor = event.color.hex;
  }

  toggleColorPicker() {
    this.showColorPicker = !this.showColorPicker;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.color-picker-container')) {
      this.showColorPicker = false;
    }
  }
}
