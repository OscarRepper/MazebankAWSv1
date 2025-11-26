import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionDeClientes } from './gestion-de-clientes';

describe('GestionDeClientes', () => {
  let component: GestionDeClientes;
  let fixture: ComponentFixture<GestionDeClientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDeClientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionDeClientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
