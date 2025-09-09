import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSymbol } from './profile-symbol';

describe('ProfileSymbol', () => {
  let component: ProfileSymbol;
  let fixture: ComponentFixture<ProfileSymbol>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSymbol]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileSymbol);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
