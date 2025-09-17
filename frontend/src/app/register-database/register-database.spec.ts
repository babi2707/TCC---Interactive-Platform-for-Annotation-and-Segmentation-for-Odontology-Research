import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterDatabase } from './register-database';

describe('RegisterDatabase', () => {
  let component: RegisterDatabase;
  let fixture: ComponentFixture<RegisterDatabase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterDatabase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterDatabase);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
