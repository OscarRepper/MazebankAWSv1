import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteSolicitarCredito } from './cliente-solicitar-credito';

describe('ClienteSolicitarCredito', () => {
  let component: ClienteSolicitarCredito;
  let fixture: ComponentFixture<ClienteSolicitarCredito>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteSolicitarCredito]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteSolicitarCredito);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
