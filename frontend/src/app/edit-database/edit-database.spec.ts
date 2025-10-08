import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDatabase } from './edit-database';

describe('EditDatabase', () => {
  let component: EditDatabase;
  let fixture: ComponentFixture<EditDatabase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDatabase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditDatabase);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
