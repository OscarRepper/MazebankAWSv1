import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainAdmin } from './main-admin';

describe('MainAdmin', () => {
  let component: MainAdmin;
  let fixture: ComponentFixture<MainAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
