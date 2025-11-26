import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelGerente } from './panel-gerente';

describe('PanelGerente', () => {
  let component: PanelGerente;
  let fixture: ComponentFixture<PanelGerente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelGerente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanelGerente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
