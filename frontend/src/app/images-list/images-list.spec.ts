import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImagesList } from './images-list';

describe('ImagesList', () => {
  let component: ImagesList;
  let fixture: ComponentFixture<ImagesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImagesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
