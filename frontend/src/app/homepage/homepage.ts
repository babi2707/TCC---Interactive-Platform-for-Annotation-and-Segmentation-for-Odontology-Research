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
import { debounceTime, Subject, Subscription } from 'rxjs';
import { HttpEventType } from '@angular/common/http';

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
  @ViewChild('segmentedImage', { static: false })
  segmentedImage!: ElementRef<HTMLImageElement>;

  imageId!: number;
  imageUrl: string = '';
  segmentedImageUrl: string = '';

  isLoadingInitialMarkers: boolean = false;
  initialMarkersUrl: string = '';

  brushX: number = 0;
  brushY: number = 0;
  showBrush = false;
  showObjectColorPicker = false;
  showBackgroundColorPicker = false;
  brushSize: number = 10;
  drawing = false;
  activeBrushMode: 'object' | 'background' | 'eraser' = 'object';
  objectBrushColor: string = '#0ac404ff';
  backgroundBrushColor: string = '#ff0000';
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

  isPanning: boolean = false;
  panX: number = 0;
  panY: number = 0;
  startPanX: number = 0;
  startPanY: number = 0;
  showPanHint: boolean = false;

  undoStack: { brushStrokes: BrushStroke[]; objectRegions: ObjectRegion[] }[] =
    [];
  redoStack: { brushStrokes: BrushStroke[]; objectRegions: ObjectRegion[] }[] =
    [];

  isSegmenting: boolean = false;
  segmentationInProgress: boolean = false;

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

  generateInitialMarkers() {
    if (!this.imageUrl) {
      alert('Por favor, carregue uma imagem primeiro.');
      return;
    }

    this.isLoadingInitialMarkers = true;

    // Criar FormData
    const formData = new FormData();

    // Buscar a imagem original
    fetch(this.imageUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erro ao carregar imagem: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        formData.append('image', blob, 'original.png');
        formData.append('imageId', this.imageId.toString());

        // Chamar serviço para gerar marcadores iniciais
        this.apiService.generateInitialMarkers(formData).subscribe({
          next: (event: any) => {
            if (event.type === HttpEventType.Response) {
              const response = event.body;

              if (response.status === 'success') {
                this.initialMarkersUrl = `http://localhost:8080${response.markersUrl}`;

                // Adicionar timestamp para evitar cache
                this.initialMarkersUrl += '?t=' + Date.now();

                this.loadInitialMarkersToCanvas(response.stats);

                console.log(
                  '✅ Marcadores iniciais gerados com sucesso!',
                  response.stats
                );

                // Mostrar estatísticas para o usuário
                const stats =
                  typeof response.stats === 'string'
                    ? JSON.parse(response.stats)
                    : response.stats;
                this.showMarkersStats(stats);
              } else {
                alert('Erro ao gerar marcadores iniciais: ' + response.message);
              }

              this.isLoadingInitialMarkers = false;
            }
          },
          error: (err) => {
            console.error('Erro ao gerar marcadores iniciais:', err);

            let errorMessage = 'Erro na comunicação com o servidor';
            if (err.error && err.error.message) {
              errorMessage = err.error.message;
            } else if (err.message) {
              errorMessage = err.message;
            }

            alert(errorMessage);
            this.isLoadingInitialMarkers = false;
          },
        });
      })
      .catch((error) => {
        console.error('Erro ao carregar imagem:', error);
        alert('Erro ao carregar imagem: ' + error.message);
        this.isLoadingInitialMarkers = false;
      });
  }

  private showMarkersStats(stats: any) {
    const method = stats.method || 'gradcam';
    const objectMarkers = stats.object_markers || 0;
    const backgroundMarkers = stats.background_markers || 0;

    let message = `Marcadores gerados com sucesso!\n`;
    message += `Método: ${
      method === 'gradcam_deeplabv3' ? 'Grad-CAM' : 'Detecção de Bordas'
    }\n`;
    message += `✅ Marcadores de objeto (verde): ${objectMarkers}\n`;
    message += `🔴 Marcadores de fundo (vermelho): ${backgroundMarkers}\n`;
    message += `📊 Total: ${objectMarkers + backgroundMarkers} marcadores`;

    // Você pode usar um toast ou modal em vez de alert
    alert(message);
  }

  private async loadInitialMarkersToCanvas(stats: any) {
    try {
      // Limpar canvas atual
      this.clearCanvas();

      // Carregar imagem de marcadores
      const markersImg = new Image();
      markersImg.crossOrigin = 'anonymous';

      markersImg.onload = () => {
        console.log(
          '✅ Imagem de marcadores carregada:',
          markersImg.width,
          'x',
          markersImg.height
        );
        this.processMarkersImage(markersImg);
      };

      markersImg.onerror = (err) => {
        console.error('❌ Erro ao carregar imagem de marcadores:', err);
        console.log('📁 URL tentada:', this.initialMarkersUrl);

        // Tentar sem timestamp
        const urlWithoutTimestamp = this.initialMarkersUrl.split('?')[0];
        const imgRetry = new Image();

        imgRetry.onload = () => {
          console.log('✅ Imagem carregada sem timestamp');
          this.processMarkersImage(imgRetry);
        };

        imgRetry.onerror = () => {
          console.error('❌ Falha também sem timestamp');
          alert(
            'Imagem de marcadores foi gerada mas não pode ser carregada. Verifique o console para detalhes.'
          );
        };

        imgRetry.src = urlWithoutTimestamp;
      };

      markersImg.src = this.initialMarkersUrl;
    } catch (error) {
      console.error('Erro ao processar marcadores iniciais:', error);
      const message = error instanceof Error ? error.message : String(error);
      alert('Erro ao processar marcadores: ' + message);
    }
  }

  private processMarkersImage(markersImg: HTMLImageElement) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = markersImg.width;
    tempCanvas.height = markersImg.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.drawImage(markersImg, 0, 0);
    const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );
    const data = imageData.data;

    const scaleX = this.drawCanvas.nativeElement.width / markersImg.width;
    const scaleY = this.drawCanvas.nativeElement.height / markersImg.height;

    // Limpar strokes anteriores
    this.brushStrokes = [];
    this.objectRegions = [];

    // Processar pixels para encontrar marcadores
    const objectPoints: { x: number; y: number }[] = [];
    const backgroundPoints: { x: number; y: number }[] = [];

    for (let y = 0; y < markersImg.height; y += 2) {
      // Amostrar a cada 2 pixels
      for (let x = 0; x < markersImg.width; x += 2) {
        const index = (y * markersImg.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        // Verificar se é marcador verde (objeto) - tolerância para variações
        if (g > 200 && r < 150 && b < 150 && a > 100) {
          objectPoints.push({ x: x * scaleX, y: y * scaleY });
        }
        // Verificar se é marcador vermelho (background)
        else if (r > 200 && g < 150 && b < 150 && a > 100) {
          backgroundPoints.push({ x: x * scaleX, y: y * scaleY });
        }
      }
    }

    // Adicionar pontos ao canvas com tamanhos apropriados
    objectPoints.forEach((point) => {
      this.addMarkerToCanvas(point.x, point.y, 'object', 15); // Marcadores maiores para objetos
    });

    backgroundPoints.forEach((point) => {
      this.addMarkerToCanvas(point.x, point.y, 'background', 10);
    });

    this.redrawStrokes();
    console.log(
      `🎯 Processados ${objectPoints.length} marcadores de objeto e ${backgroundPoints.length} marcadores de fundo`
    );
  }

  private addMarkerToCanvas(
    x: number,
    y: number,
    type: 'object' | 'background',
    size?: number
  ) {
    const strokeSize = size || (type === 'object' ? 15 : 10);

    const stroke: BrushStroke = {
      x,
      y,
      size: strokeSize,
      color:
        type === 'object' ? this.objectBrushColor : this.backgroundBrushColor,
      mode: type,
    };

    this.brushStrokes.push(stroke);
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
    if (event.shiftKey) return;

    event.preventDefault();
    this.drawing = true;
    this.currentStroke = [];

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const drawX = event.clientX - rect.left;
    const drawY = event.clientY - rect.top;

    // Desenhar imediatamente no ponto inicial
    this.draw(drawX, drawY, true);

    this.saveState();
  }

  stopDrawing() {
    this.drawing = false;
    if (this.currentStroke.length > 0) this.saveCurrentStrokeAsRegion();
    if (this.ctx) this.ctx.beginPath();
  }

  draw(x: number, y: number, isNewStroke: boolean = false) {
    if (!this.ctx) return;

    // Configurar o estilo do pincel
    this.ctx.lineWidth = this.brushSize;
    this.ctx.strokeStyle =
      this.activeBrushMode === 'eraser' ? 'rgba(0,0,0,1)' : this.brushColor;
    this.ctx.globalCompositeOperation =
      this.activeBrushMode === 'eraser' ? 'destination-out' : 'source-over';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.activeBrushMode === 'eraser') {
      // Para o eraser, desenhar um círculo que apaga
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.brushSize / 2, 0, 2 * Math.PI);
      this.ctx.fill();
    } else {
      // Para objetos e background, desenhar um círculo sólido
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.brushSize / 2, 0, 2 * Math.PI);
      this.ctx.fillStyle = this.brushColor;
      this.ctx.fill();
    }

    // Adicionar ao array de strokes (apenas se não for eraser)
    if (this.activeBrushMode !== 'eraser') {
      this.brushStrokes.push({
        x,
        y,
        size: this.brushSize,
        color: this.brushColor,
        mode: this.activeBrushMode,
      });
    }

    // Para o eraser, remover strokes que estão dentro da área apagada
    if (this.activeBrushMode === 'eraser') {
      this.removeStrokesInArea(x, y, this.brushSize / 2);
    }
  }

  private removeStrokesInArea(
    eraseX: number,
    eraseY: number,
    eraseRadius: number
  ) {
    this.brushStrokes = this.brushStrokes.filter((stroke) => {
      const distance = Math.sqrt(
        Math.pow(stroke.x - eraseX, 2) + Math.pow(stroke.y - eraseY, 2)
      );
      return distance > eraseRadius + stroke.size / 2;
    });
  }

  erase() {
    this.activeTool = 'eraser';
    this.activeBrushMode = 'eraser';
    this.showBrush = true;
  }

  hasMarkers(): boolean {
    const objectStrokes = this.brushStrokes.filter(
      (s) => s.mode === 'object'
    ).length;
    const backgroundStrokes = this.brushStrokes.filter(
      (s) => s.mode === 'background'
    ).length;

    return objectStrokes > 0 && backgroundStrokes > 0;
  }

  private saveCurrentStrokeAsRegion() {
    if (
      this.currentStroke.length > 1 &&
      (this.activeBrushMode === 'object' ||
        this.activeBrushMode === 'background')
    ) {
      const region: ObjectRegion = {
        type: this.activeBrushMode,
        points: this.currentStroke.map((p) => ({ x: p.x, y: p.y })),
        color: this.brushColor,
      };
      this.objectRegions.push(region);
    }
    this.currentStroke = [];
  }

  private saveState() {
    this.undoStack.push({
      brushStrokes: [...this.brushStrokes.map((s) => ({ ...s }))],
      objectRegions: [
        ...this.objectRegions.map((r) => ({
          ...r,
          points: r.points.map((p) => ({ ...p })),
        })),
      ],
    });
    this.redoStack = [];
  }

  redrawStrokes() {
    if (!this.ctx) return;

    // Limpar canvas completamente
    this.ctx.clearRect(
      0,
      0,
      this.drawCanvas.nativeElement.width,
      this.drawCanvas.nativeElement.height
    );

    // Desenhar cada stroke como um ponto individual
    this.brushStrokes.forEach((stroke) => {
      this.ctx.beginPath();

      if (stroke.mode === 'eraser') {
        // Para o eraser, usar composição para apagar
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.arc(stroke.x, stroke.y, stroke.size / 2, 0, 2 * Math.PI);
        this.ctx.fill();
      } else {
        // Para objetos e background, desenhar círculos sólidos
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = stroke.color;
        this.ctx.arc(stroke.x, stroke.y, stroke.size / 2, 0, 2 * Math.PI);
        this.ctx.fill();
      }

      this.ctx.closePath();
    });

    // Resetar a composição para o padrão
    this.ctx.globalCompositeOperation = 'source-over';
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

  get brushColor() {
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
      this.showPanHintMessage();
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel = +(this.zoomLevel - this.zoomStep).toFixed(2);
      this.applyZoom();
      this.showPanHintMessage();
    }
  }

  applyZoom() {
    const img = this.imageElement?.nativeElement;
    const canvas = this.drawCanvas?.nativeElement;

    if (img && canvas) {
      const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;

      img.style.transform = transform;
      img.style.transformOrigin = 'center center';

      canvas.style.transform = transform;
      canvas.style.transformOrigin = 'center center';
    }
  }

  get canZoomIn(): boolean {
    return this.zoomLevel < this.maxZoom;
  }

  get canZoomOut(): boolean {
    return this.zoomLevel > this.minZoom;
  }

  private showPanHintMessage() {
    if (this.zoomLevel > 1) {
      this.showPanHint = true;
      setTimeout(() => (this.showPanHint = false), 3500);
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const current = {
      brushStrokes: [...this.brushStrokes.map((s) => ({ ...s }))],
      objectRegions: [
        ...this.objectRegions.map((r) => ({
          ...r,
          points: r.points.map((p) => ({ ...p })),
        })),
      ],
    };
    this.redoStack.push(current);

    const previous = this.undoStack.pop()!;
    this.brushStrokes = previous.brushStrokes;
    this.objectRegions = previous.objectRegions;

    this.redrawStrokes();
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const current = {
      brushStrokes: [...this.brushStrokes.map((s) => ({ ...s }))],
      objectRegions: [
        ...this.objectRegions.map((r) => ({
          ...r,
          points: r.points.map((p) => ({ ...p })),
        })),
      ],
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.brushStrokes = next.brushStrokes;
    this.objectRegions = next.objectRegions;

    this.redrawStrokes();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
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

  @HostListener('window:mousedown', ['$event'])
  onMouseDownPan(event: MouseEvent) {
    if (event.button === 0 && event.shiftKey && this.zoomLevel > 1) {
      this.isPanning = true;
      this.startPanX = event.clientX - this.panX;
      this.startPanY = event.clientY - this.panY;
      document.body.style.cursor = 'grab';
      event.preventDefault();
    }
  }

  @HostListener('window:mouseup')
  onMouseUpPan() {
    this.isPanning = false;
    document.body.style.cursor = 'default';
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMovePan(event: MouseEvent) {
    if (!this.isPanning) return;

    this.panX = event.clientX - this.startPanX;
    this.panY = event.clientY - this.startPanY;
    this.applyZoom();
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

  performManualSegmentation() {
    if (!this.hasMarkers()) {
      alert(
        'Por favor, marque pelo menos algumas áreas de objeto (verde) ou fundo (vermelho) antes de segmentar.'
      );
      return;
    }

    this.segmentationInProgress = true;
    this.performSegmentation();
  }

  private async performSegmentation() {
    if (!this.imageUrl || this.isSegmenting || !this.hasMarkers()) {
      this.segmentationInProgress = false;
      return;
    }

    this.isSegmenting = true;

    try {
      const markersBlob = await this.generateMarkersMask();
      const formData = new FormData();

      const imgResponse = await fetch(this.imageUrl);
      const imgBlob = await imgResponse.blob();

      formData.append('image', imgBlob, 'original.png');
      formData.append('markers', markersBlob, 'markers.png');
      formData.append('imageId', this.imageId.toString());

      if (this.segmentedImageUrl) {
        const filename = this.extractFilenameFromUrl(this.segmentedImageUrl);
        if (filename) {
          formData.append('outputFilename', filename);
        }
      }

      this.apiService.segmentation(formData).subscribe({
        next: (res: any) => {
          console.log('Resposta da segmentação:', res);

          if (res.status === 'success' && res.segmentedImageUrl) {
            let segmentedImageUrl = res.segmentedImageUrl;

            if (!segmentedImageUrl.startsWith('http')) {
              if (segmentedImageUrl.startsWith('/')) {
                segmentedImageUrl = `http://localhost:8080${segmentedImageUrl}`;
              } else {
                segmentedImageUrl = `http://localhost:8080/${segmentedImageUrl}`;
              }
            }

            const finalImageUrl = segmentedImageUrl + '?t=' + Date.now();
            this.segmentedImageUrl = finalImageUrl;

            console.log(
              'URL final da imagem segmentada:',
              this.segmentedImageUrl
            );

            this.loadSegmentedImage();
          } else {
            console.warn('Segmentação retornou status de erro:', res);
            alert(
              'Erro na segmentação: ' + (res.message || 'Resposta inválida')
            );
            this.isSegmenting = false;
            this.segmentationInProgress = false;
          }
        },
        error: (err) => {
          console.error('Erro na segmentação:', err);
          alert('Erro na comunicação com o servidor');
          this.isSegmenting = false;
          this.segmentationInProgress = false;
        },
      });
    } catch (error) {
      console.error('Erro ao gerar máscara:', error);
      this.isSegmenting = false;
      this.segmentationInProgress = false;
    }
  }

  private loadSegmentedImage() {
    if (this.segmentedImage && this.segmentedImage.nativeElement) {
      this.checkFileAccess(this.segmentedImageUrl);

      const img = new Image();

      img.onload = () => {
        console.log('✅ Imagem segmentada carregada com sucesso!');
        this.segmentedImage.nativeElement.src = this.segmentedImageUrl;
        this.isSegmenting = false;
        this.segmentationInProgress = false;
      };

      img.onerror = (err) => {
        console.error('❌ Erro ao carregar imagem segmentada:', err);
        console.log('📁 URL tentada:', this.segmentedImageUrl);

        const urlWithoutTimestamp = this.segmentedImageUrl.split('?')[0];
        console.log('🔄 Tentando sem timestamp:', urlWithoutTimestamp);

        const imgRetry = new Image();
        imgRetry.onload = () => {
          this.segmentedImage.nativeElement.src = urlWithoutTimestamp;
          this.isSegmenting = false;
          this.segmentationInProgress = false;
        };
        imgRetry.onerror = () => {
          console.error('❌ Falha também sem timestamp');
          this.isSegmenting = false;
          this.segmentationInProgress = false;

          this.checkFileAccess(urlWithoutTimestamp);

          alert(
            'Imagem segmentada foi gerada mas não pode ser carregada (Erro 403). Verifique as permissões do servidor.'
          );
        };
        imgRetry.src = urlWithoutTimestamp;
      };

      img.src = this.segmentedImageUrl;
    } else {
      this.isSegmenting = false;
      this.segmentationInProgress = false;
    }
  }

  private extractFilenameFromUrl(url: string): string | null {
    try {
      const cleanUrl = url.split('?')[0];
      const urlObj = new URL(cleanUrl);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      return segments[segments.length - 1];
    } catch (error) {
      console.error('Erro ao extrair filename da URL:', error);
      return null;
    }
  }

  async checkFileAccess(url: string) {
    const testUrl = url.split('?')[0];
    console.log('🔍 Verificando acesso ao arquivo:', testUrl);

    try {
      const response = await fetch(testUrl, { method: 'HEAD' });
      console.log(
        '📊 Status do arquivo:',
        response.status,
        response.statusText
      );
      console.log(
        '📋 Headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (response.status === 200) {
        console.log('✅ Arquivo existe e é acessível');
      } else if (response.status === 404) {
        console.error('❌ Arquivo não encontrado (404)');
      } else if (response.status === 403) {
        console.error('❌ Acesso negado (403) - Problema de permissões');

        const img = new Image();
        img.onerror = () => console.error('❌ Erro também via Image element');
        img.onload = () => console.log('✅ Carregou via Image element');
        img.src = testUrl;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar arquivo:', error);
    }
  }

  async generateMarkersMask(): Promise<Blob> {
    const drawCanvas = this.drawCanvas.nativeElement;
    const img = this.imageElement.nativeElement;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const tempCtx = tempCanvas.getContext('2d')!;

    const scaleX = tempCanvas.width / drawCanvas.width;
    const scaleY = tempCanvas.height / drawCanvas.height;

    tempCtx.save();
    tempCtx.scale(scaleX, scaleY);
    tempCtx.drawImage(drawCanvas, 0, 0);
    tempCtx.restore();

    const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      const isObject = g > 100 && r < 100 && b < 100;
      const isBackground = r > 100 && g < 100 && b < 100;

      data[i] = isBackground ? 255 : isObject ? 0 : 0;
      data[i + 1] = isObject ? 255 : isBackground ? 0 : 0;
      data[i + 2] = 0;
      data[i + 3] = isObject || isBackground ? 255 : 0;
    }

    tempCtx.putImageData(imageData, 0, 0);

    return new Promise<Blob>((resolve) => {
      tempCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Falha ao gerar blob da máscara');
        }
      }, 'image/png');
    });
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
