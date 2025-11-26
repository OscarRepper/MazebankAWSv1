import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallesCredito } from './detalles-credito';

describe('DetallesCredito', () => {
  let component: DetallesCredito;
  let fixture: ComponentFixture<DetallesCredito>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallesCredito]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetallesCredito);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
