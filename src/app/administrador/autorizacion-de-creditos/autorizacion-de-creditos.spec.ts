import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutorizacionDeCreditos } from './autorizacion-de-creditos';

describe('AutorizacionDeCreditos', () => {
  let component: AutorizacionDeCreditos;
  let fixture: ComponentFixture<AutorizacionDeCreditos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutorizacionDeCreditos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutorizacionDeCreditos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
