import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileSymbol } from "../profile-symbol/profile-symbol";
import { ApiService } from '../api.services';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, MatDividerModule, ProfileSymbol],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.scss'],
})
export class Homepage implements OnInit {
  imageId!: number;
  imageUrl: string = '';
  segmentedImageUrl: string = '';

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
    // this.apiService.getImageById(this.imageId).subscribe({
    //   next: (data: any) => {
    //     this.imageUrl = `http://localhost:8080/${data.file_path}`;
    //   },
    //   error: (err) => {
    //     console.error('Erro ao carregar imagem:', err);
    //   },
    // });
  }
}
