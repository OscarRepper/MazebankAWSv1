import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroDeNuevoAdministrador } from './registro-de-nuevo-administrador';

describe('RegistroDeNuevoAdministrador', () => {
  let component: RegistroDeNuevoAdministrador;
  let fixture: ComponentFixture<RegistroDeNuevoAdministrador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroDeNuevoAdministrador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroDeNuevoAdministrador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
