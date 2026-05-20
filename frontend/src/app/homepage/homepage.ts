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

  private dbSaveSubject = new Subject<void>();
  isLoadingState: boolean = true;
  private autoSaveSubject = new Subject<void>();
  private autoSaveSubscription!: Subscription;
  private isLeavingPage = false;

  constructor(private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('imageId');
      if (id) {
        this.imageId = Number(id);
        this.loadBaseImageAndState();
      }
    });

    // Configurar auto-save mais agressivo
    this.autoSaveSubscription = this.autoSaveSubject
      .pipe(
        debounceTime(1500) // Reduzido para salvar mais rápido
      )
      .subscribe(() => {
        this._autoSaveToDB();
      });

    // Salvar antes de sair da página
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
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
    this.isLeavingPage = true;
    this.performFinalSave();

    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }

    window.removeEventListener(
      'beforeunload',
      this.handleBeforeUnload.bind(this)
    );
  }

  private handleBeforeUnload(event: BeforeUnloadEvent) {
    if (this.brushStrokes.length > 0) {
      this.performFinalSaveSync(); // Tentativa síncrona
      // Opcional: mostrar mensagem de confirmação
      event.returnValue =
        'Você tem alterações não salvas. Tem certeza que deseja sair?';
    }
  }

  private performFinalSave() {
    if (this.isLeavingPage && this.brushStrokes.length > 0) {
      this._saveStateToDB(); // Usa o método existente
    }
  }

  private performFinalSaveSync() {
    // Tentativa de salvamento síncrono (pode não funcionar em todos os browsers)
    if (this.brushStrokes.length > 0) {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        `http://localhost:8080/annotation/${this.imageId}/auto-save`,
        false
      );
      xhr.setRequestHeader('Content-Type', 'application/json');

      const stateToSave = {
        brushStrokes: this.brushStrokes,
        lastSave: new Date().toISOString(),
        isFinalSave: true,
      };

      try {
        xhr.send(JSON.stringify(stateToSave));
        console.log('✅ Salvamento síncrono realizado');
      } catch (e) {
        console.error('❌ Erro no salvamento síncrono:', e);
      }
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

  loadBaseImageAndState() {
    this.isLoadingState = true;
    this.apiService.findImageById(this.imageId).subscribe({
      next: (data: any) => {
        this.imageUrl = `http://localhost:8080/${data.file_path}`;
        const img = new Image();
        img.onload = () => {
          setTimeout(() => {
            this.resizeCanvas();
            // Agora, carregue os dados salvos
            this.loadSavedState();
          }, 100);
        };
        img.src = this.imageUrl;
      },
      error: (err) => {
        console.error('Erro ao carregar imagem:', err);
        this.isLoadingState = false;
      },
    });
  }

  private loadSavedState() {
    this.isLoadingState = true;

    console.log('🔄 Carregando estado salvo...');

    // Primeiro: carregar anotações (traços e marcadores)
    this.apiService.getAnnotation(this.imageId).subscribe({
      next: (response: any) => {
        console.log('📥 Resposta das anotações:', response);

        let brushStrokes: BrushStroke[] = [];

        if (response.annotationData?.brushStrokes) {
          brushStrokes = response.annotationData.brushStrokes;
          console.log('✅ Carregando brushStrokes do annotationData');
        } else if (response.brushStrokes) {
          brushStrokes = response.brushStrokes;
          console.log('✅ Carregando brushStrokes do formato alternativo');
        }

        if (brushStrokes.length > 0) {
          this.brushStrokes = brushStrokes;
          this.redrawStrokes();
          console.log(`✅ ${brushStrokes.length} traços carregados do banco`);
        } else {
          console.log('ℹ️ Nenhum traço salvo encontrado no banco');
        }

        // Carregar marcadores iniciais se existirem
        if (response.filePath) {
          this.initialMarkersUrl =
            'http://localhost:8080' + response.filePath + '?t=' + Date.now();
          console.log(
            '📍 Marcadores iniciais encontrados:',
            this.initialMarkersUrl
          );
        }

        this.saveState();

        // DEPOIS das anotações, carregar a imagem segmentada
        this.loadSegmentedImageFromDB();
      },
      error: (err) => {
        console.log('ℹ️ Nenhuma anotação salva encontrada:', err);
        // Mesmo sem anotações, tentar carregar imagem segmentada
        this.loadSegmentedImageFromDB();
      },
    });
  }

  private loadSegmentedImageFromDB() {
    this.apiService.getSegmentedImage(this.imageId).subscribe({
      next: (response: any) => {
        console.log('📥 Resposta completa da imagem segmentada:', response);

        if (response && response.segmentedImageUrl) {
          // CORREÇÃO PRINCIPAL: Garantir que a URL está correta
          let segmentedUrl = response.segmentedImageUrl;

          // Se a URL não começa com /, adiciona
          if (!segmentedUrl.startsWith('/')) {
            segmentedUrl = '/' + segmentedUrl;
          }

          // Remover duplicações de "segmented/" se houver
          segmentedUrl = segmentedUrl.replace(
            'segmented/segmented/',
            'segmented/'
          );

          // Construir URL completa
          this.segmentedImageUrl = `http://localhost:8080${segmentedUrl}?t=${Date.now()}`;

          console.log(
            '✅ URL final da imagem segmentada:',
            this.segmentedImageUrl
          );

          // Carregar a imagem
          this.loadSegmentedImage();
        } else {
          console.log('ℹ️ Nenhuma imagem segmentada encontrada no banco');
          this.segmentedImageUrl = ''; // Limpar URL se não existir
        }
      },
      error: (err) => {
        console.error('❌ Erro ao carregar imagem segmentada:', err);
        this.segmentedImageUrl = ''; // Limpar em caso de erro
      },
    });
  }

  private triggerDBSave() {
    this.dbSaveSubject.next();
  }

  private _saveStateToDB() {
    if (!this.imageId) return;

    // Apenas salvamos os brushStrokes, pois é a fonte da verdade para o redraw
    const stateToSave = {
      brushStrokes: this.brushStrokes,
      // Você pode adicionar mais dados aqui se precisar
    };

    this.apiService.saveAnnotation(this.imageId, stateToSave).subscribe({
      next: () => console.log('✅ Estado salvo automaticamente no DB.'),
      error: (err) => console.error('❌ Falha ao salvar estado no DB:', err),
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

                // Mostrar estatísticas para o usuário
                const stats =
                  typeof response.stats === 'string'
                    ? JSON.parse(response.stats)
                    : response.stats;
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

    this.saveState();

    // Dispara o salvamento no banco
    this.triggerDBSave();
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

    if (this.drawing && this.brushStrokes.length % 50 === 0) {
      this.triggerAutoSave();
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
    this.triggerAutoSave();
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

    // Dispara auto-save imediatamente após cada alteração
    this.triggerAutoSave();
  }

  private triggerAutoSave() {
    this.autoSaveSubject.next();
  }

  private _autoSaveToDB() {
    if (!this.imageId || this.brushStrokes.length === 0) return;

    const stateToSave = {
      brushStrokes: this.brushStrokes,
      lastAutoSave: new Date().toISOString(),
      totalStrokes: this.brushStrokes.length,
      objectStrokes: this.brushStrokes.filter((s) => s.mode === 'object')
        .length,
      backgroundStrokes: this.brushStrokes.filter(
        (s) => s.mode === 'background'
      ).length,
    };

    this.apiService.autoSaveAnnotation(this.imageId, stateToSave).subscribe({
      next: (response) => {
        console.log('✅ Auto-save realizado:', response);
      },
      error: (err) => {
        console.error('❌ Falha no auto-save:', err);
        // Tentar novamente após 5 segundos
        setTimeout(() => this.triggerAutoSave(), 5000);
      },
    });
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
      this.triggerAutoSave();
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
    const lastState = this.undoStack.pop()!;
    // Salva o estado ATUAL no Redo
    this.redoStack.push({
      brushStrokes: [...this.brushStrokes.map((s) => ({ ...s }))],
      objectRegions: [], // Adicione se você usar
    });
    // Restaura o estado anterior
    this.brushStrokes = lastState.brushStrokes;
    this.objectRegions = lastState.objectRegions;
    this.redrawStrokes();
    this.triggerAutoSave();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const nextState = this.redoStack.pop()!;
    // Salva o estado ATUAL no Undo
    this.undoStack.push({
      brushStrokes: [...this.brushStrokes.map((s) => ({ ...s }))],
      objectRegions: [], // Adicione se você usar
    });
    // Restaura o estado futuro
    this.brushStrokes = nextState.brushStrokes;
    this.objectRegions = nextState.objectRegions;
    this.redrawStrokes();
    this.triggerAutoSave();
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
    console.log('🔄 Iniciando processo de segmentação...');

    try {
      const markersBlob = await this.generateMarkersMask();
      const formData = new FormData();

      const imgResponse = await fetch(this.imageUrl);
      const imgBlob = await imgResponse.blob();

      formData.append('image', imgBlob, 'original.png');
      formData.append('markers', markersBlob, 'markers.png');
      formData.append('imageId', this.imageId.toString());

      // CORREÇÃO: Não enviar outputFilename - deixar o backend decidir
      // Isso evita problemas com nomes de arquivo

      this.apiService.segmentation(formData).subscribe({
        next: (res: any) => {
          console.log('📨 Resposta da segmentação:', res);

          if (res.status === 'success' && res.segmentedImageUrl) {
            let segmentedImageUrl = res.segmentedImageUrl;

            // CORREÇÃO: Garantir formato correto da URL
            if (!segmentedImageUrl.startsWith('http')) {
              if (segmentedImageUrl.startsWith('/')) {
                segmentedImageUrl = `http://localhost:8080${segmentedImageUrl}`;
              } else {
                segmentedImageUrl = `http://localhost:8080/${segmentedImageUrl}`;
              }
            }

            // CORREÇÃO: Usar timestamp para evitar cache
            const finalImageUrl = segmentedImageUrl + '?t=' + Date.now();
            this.segmentedImageUrl = finalImageUrl;

            console.log(
              '✅ URL final da imagem segmentada:',
              this.segmentedImageUrl
            );

            // CORREÇÃO: Carregar a imagem imediatamente após receber a URL
            this.loadSegmentedImage();
          } else {
            console.error('❌ Segmentação retornou status de erro:', res);
            alert(
              'Erro na segmentação: ' + (res.message || 'Resposta inválida')
            );
            this.isSegmenting = false;
            this.segmentationInProgress = false;
          }
        },
        error: (err) => {
          console.error('❌ Erro na segmentação:', err);
          alert('Erro na comunicação com o servidor: ' + err.message);
          this.isSegmenting = false;
          this.segmentationInProgress = false;
        },
      });
    } catch (error) {
      console.error('❌ Erro ao gerar máscara:', error);
      this.isSegmenting = false;
      this.segmentationInProgress = false;
    }
  }

  private loadSegmentedImage() {
    if (!this.segmentedImageUrl) {
      console.log('ℹ️ Nenhuma URL de imagem segmentada para carregar');
      return;
    }

    console.log('🔄 Iniciando carregamento da imagem segmentada...');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      console.log('✅ Imagem segmentada carregada com sucesso!');
      console.log('📐 Dimensões:', img.width, 'x', img.height);

      // Atualizar o elemento de imagem no template
      if (this.segmentedImage && this.segmentedImage.nativeElement) {
        this.segmentedImage.nativeElement.src = this.segmentedImageUrl;
        this.segmentedImage.nativeElement.style.display = 'block';
        console.log('🎯 Imagem segmentada atribuída ao elemento DOM');
      }

      this.isSegmenting = false;
      this.segmentationInProgress = false;
    };

    img.onerror = (err) => {
      console.error('❌ Erro ao carregar imagem segmentada:', err);

      // Tentar sem timestamp
      const urlWithoutTimestamp = this.segmentedImageUrl.split('?')[0];
      console.log('🔄 Tentando sem timestamp:', urlWithoutTimestamp);

      const imgRetry = new Image();
      imgRetry.crossOrigin = 'anonymous';

      imgRetry.onload = () => {
        console.log('✅ Imagem carregada sem timestamp');
        if (this.segmentedImage && this.segmentedImage.nativeElement) {
          this.segmentedImage.nativeElement.src = urlWithoutTimestamp;
          this.segmentedImage.nativeElement.style.display = 'block';
        }
        this.isSegmenting = false;
        this.segmentationInProgress = false;
      };

      imgRetry.onerror = (retryErr) => {
        console.error('❌ Falha também sem timestamp:', retryErr);
        this.isSegmenting = false;
        this.segmentationInProgress = false;

        // Verificar acesso ao arquivo
        this.checkFileAccess(urlWithoutTimestamp);

        // Tentar uma terceira vez com URL alternativa
        this.tryAlternativeSegmentedUrl();
      };

      imgRetry.src = urlWithoutTimestamp;
    };

    img.src = this.segmentedImageUrl;
  }

  private tryAlternativeSegmentedUrl() {
    console.log('🔄 Tentando URL alternativa...');

    // Tentar URL sem o prefixo duplicado
    const alternativeUrl = this.segmentedImageUrl
      .replace('//localhost:8080/segmented/', '//localhost:8080/')
      .split('?')[0];

    console.log('🔧 URL alternativa:', alternativeUrl);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      console.log('✅ Imagem carregada com URL alternativa!');
      if (this.segmentedImage && this.segmentedImage.nativeElement) {
        this.segmentedImage.nativeElement.src = alternativeUrl;
        this.segmentedImage.nativeElement.style.display = 'block';
      }
      this.isSegmenting = false;
      this.segmentationInProgress = false;

      // Atualizar a URL salva
      this.segmentedImageUrl = alternativeUrl + '?t=' + Date.now();
    };

    img.onerror = (err) => {
      console.error('❌ Falha com URL alternativa:', err);
      this.isSegmenting = false;
      this.segmentationInProgress = false;
    };

    img.src = alternativeUrl;
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
    if (!this.imageId) {
      alert('ID da imagem não encontrado.');
      return;
    }

    this.apiService.getAnnotation(this.imageId).subscribe({
      next: (response) => {
        if (!response || !response.annotationData) {
          alert(
            'Nenhuma anotação encontrada no banco de dados para esta imagem.'
          );
          return;
        }

        const jsonSaved = response.annotationData;

        // Gera o texto baseado no JSON vindo do banco
        const txtContent = this.convertJsonToTxt(jsonSaved, response.createdAt);

        // Processo de download do arquivo
        const blob = new Blob([txtContent], {
          type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `db_annotations_image_${
          this.imageId
        }_${new Date().getTime()}.txt`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
        console.log('Download concluído com dados do banco.');
      },
      error: (err) => {
        console.error('Erro ao buscar anotações:', err);
        alert('Erro ao baixar anotações do servidor.');
      },
    });
  }

  convertJsonToTxt(data: any, createdDate: string): string {
    let content = `Anotações (Banco de Dados) - ID Imagem: ${this.imageId}\n`;
    content += `Data de Criação no Banco: ${new Date(
      createdDate
    ).toLocaleString()}\n`;
    content += `Data do Download: ${new Date().toLocaleString()}\n`;

    // Tenta extrair dimensões se existirem no JSON
    if (data.imageSize || data.image_size) {
      const size = data.imageSize || data.image_size;
      content += `Dimensões Originais: ${size[0]} x ${size[1]}\n`;
    }

    content += '='.repeat(50) + '\n\n';

    // Verifica se os dados vêm no formato de lista de marcadores (Python Script)
    const markers = data.markers || data.points || [];

    if (Array.isArray(markers) && markers.length > 0) {
      // Separar por tipo
      const objects = markers.filter(
        (m: any) =>
          m.label === 'foreground' ||
          m.label === 'object' ||
          m.type === 'object'
      );
      const backgrounds = markers.filter(
        (m: any) => m.label === 'background' || m.type === 'background'
      );

      // --- SEÇÃO DE OBJETOS ---
      if (objects.length > 0) {
        content += 'OBJETOS MARCADOS (Pontos/Regiões):\n';
        content += '-'.repeat(30) + '\n';
        objects.forEach((obj: any, index: number) => {
          content += `Objeto ${index + 1}: X=${obj.x}, Y=${obj.y}\n`;
          if (obj.area) content += `  Área estimada: ${obj.area}\n`;
        });
        content += '\n';
      }

      // --- SEÇÃO DE BACKGROUND ---
      if (backgrounds.length > 0) {
        content += 'ÁREAS DE BACKGROUND (Pontos):\n';
        content += '-'.repeat(30) + '\n';
        backgrounds.forEach((bg: any, index: number) => {
          content += `Background ${index + 1}: X=${bg.x}, Y=${bg.y}\n`;
        });
        content += '\n';
      }

      // --- ESTATÍSTICAS ---
      content += 'ESTATÍSTICAS DO ALGORITMO:\n';
      content += '-'.repeat(20) + '\n';
      // Tenta pegar stats do JSON ou calcula na hora
      if (data.stats) {
        content += `Objetos: ${
          data.stats.object_markers || data.stats.object || 0
        }\n`;
        content += `Backgrounds: ${
          data.stats.background_markers || data.stats.background || 0
        }\n`;
      } else {
        content += `Objetos Listados: ${objects.length}\n`;
        content += `Backgrounds Listados: ${backgrounds.length}\n`;
      }
    } else {
      // Fallback se o JSON tiver uma estrutura diferente (ex: desenhado manualmente no front e salvo como Map)
      content += 'DADOS BRUTOS (Formato JSON):\n';
      content += JSON.stringify(data, null, 2);
    }

    return content;
  }

  downloadAnnotationsJSON() {
    if (!this.imageId) {
      alert('ID da imagem não encontrado.');
      return;
    }

    this.apiService.getAnnotation(this.imageId).subscribe({
      next: (response) => {
        if (!response || !response.annotationData) {
          alert(
            'Nenhuma anotação encontrada no banco de dados para esta imagem.'
          );
          return;
        }

        const jsonSaved = JSON.stringify(response.annotationData);

        const blob = new Blob([jsonSaved], {
          type: 'application/json;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `db_annotations_image_${
          this.imageId
        }_${new Date().getTime()}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
        console.log('Download concluído com dados do banco.');
      },
      error: (err) => {
        console.error('Erro ao buscar anotações:', err);
        alert('Erro ao baixar anotações do servidor.');
      },
    });
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

  downloadSegmentedImage() {
    // 1. Verifica se a URL da imagem segmentada existe
    if (!this.segmentedImageUrl) {
      alert(
        'Não há imagem segmentada para baixar. Gere a segmentação primeiro.'
      );
      return;
    }

    console.log('Iniciando download da imagem segmentada...');

    // 2. Remove o timestamp (cache buster) da URL, se houver
    const urlToFetch = this.segmentedImageUrl.split('?')[0];

    // 3. Usa a API Fetch para buscar a imagem
    fetch(urlToFetch)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Erro ao buscar a imagem: ${response.status} ${response.statusText}`
          );
        }
        // Converte a resposta em um Blob (Binary Large Object)
        return response.blob();
      })
      .then((blob) => {
        // 4. Cria um Object URL temporário para o Blob
        const url = URL.createObjectURL(blob);

        // 5. Cria o link de download
        const link = document.createElement('a');
        link.href = url;

        // 6. Extrai o nome do arquivo original da URL para o download
        let filename = urlToFetch.substring(urlToFetch.lastIndexOf('/') + 1);
        if (!filename) {
          filename = `segmented_image_${
            this.imageId
          }_${new Date().getTime()}.png`;
        }
        link.download = filename; // Define o nome do arquivo para o download

        // 7. Simula o clique no link para iniciar o download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 8. Limpa o Object URL após um curto período
        setTimeout(() => URL.revokeObjectURL(url), 100);
      })
      .catch((err) => {
        console.error('Erro ao fazer download da imagem segmentada:', err);
        alert(
          'Erro ao baixar a imagem segmentada. Verifique o console para mais detalhes.'
        );
      });
  }

  downloadSegmentationMask() {
    if (!this.segmentedImageUrl) {
      alert(
        'Não há imagem segmentada para baixar. Gere a segmentação primeiro.'
      );
      return;
    }

    console.log('Iniciando download da máscara P&B...');
    const urlToFetch = this.segmentedImageUrl.split('?')[0];

    // 1. Criar um canvas e uma imagem na memória
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Necessário para ler pixels de uma URL

    img.onload = () => {
      // 2. Desenhar a imagem RGBA no canvas
      canvas.width = img.width;
      canvas.height = img.height;
      ctx!.drawImage(img, 0, 0);

      // 3. Ler os dados de pixel (RGBA)
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 4. Criar a nova imagem P&B
      // Iteramos de 4 em 4 (R, G, B, A)
      for (let i = 0; i < data.length; i += 4) {
        // data[i+3] é o canal Alpha
        // Se o alpha for > 128 (é objeto), pinte de branco (255)
        // Se for < 128 (é fundo), pinte de preto (0)
        const value = data[i + 3] > 128 ? 255 : 0;

        // O usuário pediu 0 e 1, mas 0 e 255 são visualmente
        // corretos para um arquivo P&B.

        data[i] = value; // Red
        data[i + 1] = value; // Green
        data[i + 2] = value; // Blue
        data[i + 3] = 255; // Alpha (deixa a máscara opaca)
      }

      // 5. Colocar os novos dados (P&B) de volta no canvas
      ctx!.putImageData(imageData, 0, 0);

      // 6. Converter o canvas para Blob e iniciar o download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Erro ao criar o blob da máscara');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Tenta pegar o nome do arquivo original
        let filename = urlToFetch.substring(urlToFetch.lastIndexOf('/') + 1);
        filename = filename
          .replace('_rgba.png', '_mask.png')
          .replace('.png', '_mask.png');
        if (!filename.includes('_mask')) {
          filename = `mask_image_${this.imageId}_${new Date().getTime()}.png`;
        }

        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    img.onerror = (err) => {
      console.error(
        'Erro ao carregar imagem segmentada para criar máscara:',
        err
      );
      alert('Erro ao carregar a imagem para gerar a máscara.');
    };

    // Inicia o processo
    img.src = urlToFetch;
  }
}
