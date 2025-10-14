import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';
import { ApiService } from '../api.services';
import { ColorSketchModule } from 'ngx-color/sketch';
import { MatTooltipModule } from '@angular/material/tooltip';

interface BrushStroke {
  x: number;
  y: number;
  size: number;
  color: string;
  mode: 'object' | 'background' | 'eraser';
}

interface ObjectRegion {
  type: 'object' | 'background' | 'eraser';
  points: { x: number; y: number }[];
  color: string;
}

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDividerModule,
    ProfileSymbol,
    ColorSketchModule,
    MatTooltipModule,
  ],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.scss'],
})
export class Homepage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('drawCanvas', { static: false })
  drawCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('imageElement', { static: false })
  imageElement!: ElementRef<HTMLImageElement>;
  private ctx!: CanvasRenderingContext2D;

  imageId!: number;
  imageUrl: string = '';
  segmentedImageUrl: string = '';

  brushX: number = 0;
  brushY: number = 0;
  showBrush = false;
  showObjectColorPicker = false;
  showBackgroundColorPicker = false;
  brushSize: number = 10;
  drawing = false;
  activeBrushMode: 'object' | 'background' | 'eraser' = 'object';
  objectBrushColor: string = '#ff0000';
  backgroundBrushColor: string = '#0ac404ff';
  brushStrokes: BrushStroke[] = [];
  objectRegions: ObjectRegion[] = [];

  activeTool: 'object' | 'background' | 'eraser' | null = 'object';

  private resizeObserver!: ResizeObserver;
  private currentStroke: {
    x: number;
    y: number;
    mode: 'object' | 'background' | 'eraser';
    color: string;
  }[] = [];

  showDownloadDropdown = false;

  zoomLevel: number = 1;
  minZoom: number = 1;
  maxZoom: number = 3;
  zoomStep: number = 0.1;

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

  ngAfterViewInit() {
    this.initCanvas();

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.redrawStrokes();
    });

    if (this.imageElement?.nativeElement) {
      this.resizeObserver.observe(this.imageElement.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setActiveTool(tool: 'object' | 'background' | 'eraser') {
    this.activeTool = tool;
    this.activeBrushMode = tool === 'eraser' ? 'eraser' : tool;
  }

  initCanvas() {
    const canvas = this.drawCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.resizeCanvas();
  }

  resizeCanvas() {
    const canvas = this.drawCanvas.nativeElement;
    const img = this.imageElement.nativeElement;

    if (img && img.clientWidth && img.clientHeight) {
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      canvas.style.width = img.clientWidth + 'px';
      canvas.style.height = img.clientHeight + 'px';

      setTimeout(() => this.redrawStrokes(), 0);
    }
  }

  loadImage() {
    this.apiService.findImageById(this.imageId).subscribe({
      next: (data: any) => {
        this.imageUrl = `http://localhost:8080/${data.file_path}`;
        const img = new Image();
        img.onload = () => {
          setTimeout(() => {
            this.resizeCanvas();
            this.redrawStrokes();
          }, 100);
        };
        img.src = this.imageUrl;
      },
      error: (err) => {
        console.error('Erro ao carregar imagem:', err);
      },
    });
  }

  onMouseMove(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.brushX = x;
    this.brushY = y;
    this.showBrush = true;

    if (this.drawing) {
      const drawX = (x - rect.width / 2) / this.zoomLevel + rect.width / 2;
      const drawY = (y - rect.height / 2) / this.zoomLevel + rect.height / 2;
      this.draw(drawX, drawY);
    }
  }

  startDrawing(event: MouseEvent) {
    event.preventDefault();
    this.drawing = true;
    this.currentStroke = [];

    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const drawX = (x - rect.width / 2) / this.zoomLevel + rect.width / 2;
    const drawY = (y - rect.height / 2) / this.zoomLevel + rect.height / 2;

    if (this.activeBrushMode !== 'eraser') {
      this.currentStroke.push({
        x: drawX,
        y: drawY,
        mode: this.activeBrushMode === 'object' ? 'object' : 'background',
        color: this.brushColor,
      });
    }

    this.draw(drawX, drawY, true);
  }

  stopDrawing() {
    this.drawing = false;

    if (this.currentStroke.length > 0) {
      this.saveCurrentStrokeAsRegion();
    }

    if (this.ctx) {
      this.ctx.beginPath();
    }
  }

  draw(x: number, y: number, isNewStroke: boolean = false) {
    if (!this.ctx) return;

    if (isNewStroke) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    } else {
      this.ctx.lineTo(x, y);
      this.currentStroke.push({
        x,
        y,
        mode: this.activeBrushMode,
        color: this.brushColor,
      });
    }

    if (this.activeBrushMode === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.brushColor;
    }

    this.ctx.lineWidth = this.brushSize;
    this.ctx.stroke();

    if (this.activeBrushMode !== 'eraser') {
      this.brushStrokes.push({
        x,
        y,
        size: this.brushSize,
        color: this.brushColor,
        mode: this.activeBrushMode,
      });
    }
  }

  erase() {
    this.activeTool = 'eraser';
    this.activeBrushMode = 'eraser';
    this.showBrush = true;
  }

  private saveCurrentStrokeAsRegion() {
    if (
      this.currentStroke.length > 1 &&
      (this.activeBrushMode === 'object' ||
        this.activeBrushMode === 'background')
    ) {
      const region: ObjectRegion = {
        type: this.activeBrushMode,
        points: [
          ...this.currentStroke.map((point) => ({ x: point.x, y: point.y })),
        ],
        color: this.brushColor,
      };
      this.objectRegions.push(region);
    }
    this.currentStroke = [];
  }

  redrawStrokes() {
    if (!this.ctx) return;

    this.ctx.clearRect(
      0,
      0,
      this.drawCanvas.nativeElement.width,
      this.drawCanvas.nativeElement.height
    );

    const groupedStrokes = this.groupStrokes();

    groupedStrokes.forEach((group) => {
      this.ctx.strokeStyle = group.color;
      this.ctx.lineWidth = group.size;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();

      group.points.forEach((point, index) => {
        if (index === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      });

      this.ctx.stroke();
    });
  }

  private groupStrokes(): {
    color: string;
    size: number;
    points: { x: number; y: number }[];
  }[] {
    const groups: {
      [key: string]: {
        color: string;
        size: number;
        points: { x: number; y: number }[];
      };
    } = {};

    this.brushStrokes.forEach((stroke) => {
      const key = `${stroke.color}-${stroke.size}`;
      if (!groups[key]) {
        groups[key] = {
          color: stroke.color,
          size: stroke.size,
          points: [],
        };
      }
      groups[key].points.push({ x: stroke.x, y: stroke.y });
    });

    return Object.values(groups);
  }

  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(
        0,
        0,
        this.drawCanvas.nativeElement.width,
        this.drawCanvas.nativeElement.height
      );
      this.brushStrokes = [];
      this.objectRegions = [];
      this.currentStroke = [];
    }
  }

  get brushColor(): string {
    return this.activeBrushMode === 'object'
      ? this.objectBrushColor
      : this.backgroundBrushColor;
  }

  hideBrush() {
    this.showBrush = false;
  }

  updateBrushSize(event: any) {
    this.brushSize = Number(event.target.value);
  }

  onObjectColorChange(event: any) {
    this.objectBrushColor = event.color.hex;
  }

  onBackgroundColorChange(event: any) {
    this.backgroundBrushColor = event.color.hex;
  }

  openObjectColorPicker() {
    this.showObjectColorPicker = true;
    this.showBackgroundColorPicker = false;
  }

  openBackgroundColorPicker() {
    this.showBackgroundColorPicker = true;
    this.showObjectColorPicker = false;
  }

  setBrushMode(mode: 'object' | 'background') {
    this.activeTool = mode;
    this.activeBrushMode = mode;
  }

  toggleColorPicker() {
    this.showBackgroundColorPicker = !this.showBackgroundColorPicker;
    this.showObjectColorPicker = !this.showObjectColorPicker;
  }

  zoomIn() {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel = +(this.zoomLevel + this.zoomStep).toFixed(2);
      this.applyZoom();
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel = +(this.zoomLevel - this.zoomStep).toFixed(2);
      this.applyZoom();
    }
  }

  applyZoom() {
    const img = this.imageElement?.nativeElement;
    const canvas = this.drawCanvas?.nativeElement;

    if (img && canvas) {
      img.style.transform = `scale(${this.zoomLevel})`;
      img.style.transformOrigin = 'center center';

      canvas.style.transform = `scale(${this.zoomLevel})`;
      canvas.style.transformOrigin = 'center center';
    }
  }

  get canZoomIn(): boolean {
    return this.zoomLevel < this.maxZoom;
  }

  get canZoomOut(): boolean {
    return this.zoomLevel > this.minZoom;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.color-picker-container')) {
      this.showBackgroundColorPicker = false;
      this.showObjectColorPicker = false;
    }

    if (!target.closest('.download')) {
      this.showDownloadDropdown = false;
    }
  }

  generateAnnotationsTXT(): string {
    const canvas = this.drawCanvas.nativeElement;
    const img = this.imageElement.nativeElement;

    let content = `Anotações da Imagem - ID: ${this.imageId}\n`;
    content += `Data: ${new Date().toLocaleString()}\n`;
    content += `Dimensões da Imagem: ${img.naturalWidth} x ${img.naturalHeight}\n`;
    content += `Dimensões do Canvas: ${canvas.width} x ${canvas.height}\n`;
    content += '='.repeat(50) + '\n\n';

    const objectGroups = this.groupRegionsByType();

    if (objectGroups.objects.length > 0) {
      content += 'OBJETOS MARCADOS:\n';
      content += '-'.repeat(30) + '\n';

      objectGroups.objects.forEach((region, index) => {
        const bounds = this.calculateRegionBounds(region.points);
        content += `Objeto ${index + 1}:\n`;
        content += `  Tipo: Objeto\n`;
        content += `  Cor: ${region.color}\n`;
        content += `  Localização: X=${bounds.centerX.toFixed(
          2
        )}, Y=${bounds.centerY.toFixed(2)}\n`;
        content += `  Área Aproximada: ${bounds.width.toFixed(
          2
        )} x ${bounds.height.toFixed(2)} pixels\n`;
        content += `  Pontos de Contorno: ${region.points.length}\n`;
        content += `  Coordenadas dos Pontos:\n`;

        const samplePoints =
          region.points.length > 10
            ? [
                ...region.points.slice(0, 5),
                { x: -1, y: -1 },
                ...region.points.slice(-5),
              ]
            : region.points;

        samplePoints.forEach((point, pointIndex) => {
          if (point.x === -1 && point.y === -1) {
            content += `    ... (${
              region.points.length - 10
            } pontos omitidos) ...\n`;
          } else {
            content += `    Ponto ${pointIndex + 1}: X=${point.x.toFixed(
              2
            )}, Y=${point.y.toFixed(2)}\n`;
          }
        });
        content += '\n';
      });
    }

    if (objectGroups.backgrounds.length > 0) {
      content += 'ÁREAS DE BACKGROUND MARCADAS:\n';
      content += '-'.repeat(40) + '\n';

      objectGroups.backgrounds.forEach((region, index) => {
        const bounds = this.calculateRegionBounds(region.points);
        content += `Background ${index + 1}:\n`;
        content += `  Tipo: Background\n`;
        content += `  Cor: ${region.color}\n`;
        content += `  Localização: X=${bounds.centerX.toFixed(
          2
        )}, Y=${bounds.centerY.toFixed(2)}\n`;
        content += `  Área Aproximada: ${bounds.width.toFixed(
          2
        )} x ${bounds.height.toFixed(2)} pixels\n`;
        content += `  Pontos de Contorno: ${region.points.length}\n\n`;
      });
    }

    content += 'ESTATÍSTICAS:\n';
    content += '-'.repeat(20) + '\n';
    content += `Total de Objetos: ${objectGroups.objects.length}\n`;
    content += `Total de Áreas de Background: ${objectGroups.backgrounds.length}\n`;
    content += `Total de Regiões: ${this.objectRegions.length}\n`;
    content += `Total de Pontos Marcados: ${this.brushStrokes.length}\n`;

    return content;
  }

  private groupRegionsByType(): {
    objects: ObjectRegion[];
    backgrounds: ObjectRegion[];
  } {
    const objects: ObjectRegion[] = [];
    const backgrounds: ObjectRegion[] = [];

    this.objectRegions.forEach((region) => {
      if (region.type === 'object') {
        objects.push(region);
      } else {
        backgrounds.push(region);
      }
    });

    return { objects, backgrounds };
  }

  private calculateRegionBounds(points: { x: number; y: number }[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  } {
    if (points.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        centerX: 0,
        centerY: 0,
        width: 0,
        height: 0,
      };
    }

    const minX = Math.min(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxX = Math.max(...points.map((p) => p.x));
    const maxY = Math.max(...points.map((p) => p.y));

    return {
      minX,
      minY,
      maxX,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  toggleDownloadDropdown(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showDownloadDropdown = !this.showDownloadDropdown;
  }

  closeDownloadDropdown() {
    this.showDownloadDropdown = false;
  }

  downloadAnnotations() {
    try {
      if (this.objectRegions.length === 0 && this.brushStrokes.length === 0) {
        alert('Não há anotações para salvar. Desenhe algo na imagem primeiro.');
        return;
      }

      const txtContent = this.generateAnnotationsTXT();
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `annotations_image_${
        this.imageId
      }_${new Date().getTime()}.txt`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      console.log('Download do arquivo TXT iniciado:', link.download);
    } catch (error) {
      console.error('Erro ao fazer download das anotações:', error);
      alert('Erro ao fazer download das anotações.');
    }
  }

  downloadAnnotatedImage() {
    try {
      const canvas = document.createElement('canvas');
      const img = this.imageElement.nativeElement;
      const drawCanvas = this.drawCanvas.nativeElement;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      const baseImage = new Image();
      baseImage.crossOrigin = 'anonymous';
      baseImage.src = img.src;

      baseImage.onload = () => {
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / drawCanvas.width;
        const scaleY = canvas.height / drawCanvas.height;

        ctx.save();
        ctx.scale(scaleX, scaleY);

        ctx.drawImage(drawCanvas, 0, 0);
        ctx.restore();

        const imageURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = `annotated_image_${
          this.imageId
        }_${new Date().getTime()}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Download da imagem anotada iniciado:', link.download);
      };

      baseImage.onerror = (err) => {
        console.error('Erro ao carregar imagem base:', err);
        alert('Erro ao gerar o download da imagem anotada.');
      };
    } catch (error) {
      console.error('Erro ao fazer download da imagem anotada:', error);
      alert('Erro ao fazer download da imagem anotada.');
    }
  }
}
