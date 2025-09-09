import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Database } from './database';

describe('Database', () => {
  let component: Database;
  let fixture: ComponentFixture<Database>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Database]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Database);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
