import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

interface RegisterResult {
  user_id: number;
  user_name: string;
  user_email: string;
  cards: {
    nomina: {
      card_number: string;
      account_number: string;
    };
    credito: {
      card_number: string;
      account_number: string;
    };
    digital: {
      card_number: string;
      account_number: string;
    };
  };
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css']
})
export class Registro {
  // UI / estado
  cargando = false;
  errorMsg = '';
  successMsg = '';
  mostrarExito = false;

  // API
  private apiBase = 'http://localhost:3001';

  // Formulario
  name = '';
  email = '';
  phone = '';
  address = '';
  password = '';
  confirmPassword = '';

  // Resultado del registro
  resultado: RegisterResult | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  // Validación de email
  validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método principal de registro
  registrarUsuario(): void {
    this.errorMsg = '';
    this.successMsg = '';
    this.resultado = null;

    // Validaciones del formulario
    if (!this.name || !this.email || !this.password) {
      this.errorMsg = 'Los campos Nombre, Email y Contraseña son obligatorios.';
      return;
    }

    if (!this.validarEmail(this.email)) {
      this.errorMsg = 'El formato del email no es válido.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    const body = {
      name: this.name,
      email: this.email.toLowerCase().trim(),
      phone: this.phone || null,
      address: this.address || null,
      password: this.password
    };

    const url = `${this.apiBase}/register`;

    console.log('[Registro] Enviando datos ->', { ...body, password: '***' });

    this.cargando = true;
    this.http.post<any>(url, body)
      .pipe(finalize(() => {
        this.cargando = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: any) => {
          console.log('[Registro] Respuesta del servidor ->', res);

          if (res?.status === 'success' && res?.data) {
            this.resultado = res.data as RegisterResult;
            this.successMsg = res.message || 'Usuario registrado exitosamente.';
            this.mostrarExito = true;

            // Limpiar formulario
            this.limpiarFormulario();

            // Opcional: Redirigir al login después de 3 segundos
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          } else {
            this.errorMsg = res?.message || 'No se pudo registrar el usuario.';
          }
        },
        error: (err: any) => {
          console.error('[Registro] ERROR /register ->', err);

          // Manejar errores específicos
          if (err.status === 409) {
            this.errorMsg = 'El email ya está registrado en el sistema.';
          } else if (err.status === 400) {
            this.errorMsg = err.error?.message || 'Datos de registro inválidos.';
          } else if (err.status === 500) {
            this.errorMsg = 'Error del servidor. Intenta nuevamente.';
          } else {
            this.errorMsg = 'Error al conectar con el servidor.';
          }
        }
      });
  }

  // Limpiar formulario
  limpiarFormulario(): void {
    this.name = '';
    this.email = '';
    this.phone = '';
    this.address = '';
    this.password = '';
    this.confirmPassword = '';
  }

  // Cerrar modal de éxito
  cerrarExito(): void {
    this.mostrarExito = false;
    this.resultado = null;
  }

  // Ir al login
  irAlLogin(): void {
    this.router.navigate(['/login']);
  }

  // Formatear número de tarjeta (XXXX XXXX XXXX XXXX)
  formatearTarjeta(numero: string): string {
    return numero.match(/.{1,4}/g)?.join(' ') || numero;
  }
}