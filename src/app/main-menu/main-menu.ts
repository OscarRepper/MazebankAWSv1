import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './main-menu.html',
  styleUrls: ['./main-menu.css']
})
export class MainMenu implements OnInit {
  // UI
  cargando = true;
  errorMsg = '';

  // Datos visibles
  nombre = '';
  email = '';

  // API (ajusta si no es localhost:3001)
  private apiBase = 'http://localhost:3001';

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log('[MainMenu] init');

    // 1) Leer usuario del localStorage
    const raw = localStorage.getItem('usuario');
    let usuario: any = null;
    try { usuario = raw ? JSON.parse(raw) : null; } catch { usuario = null; }

    const idUser = Number(usuario?.user_id ?? usuario?.id);
    console.log('[MainMenu] idUser ->', idUser);

    if (!idUser) {
      this.errorMsg = 'No hay sesión activa.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    // Mostrar email del login mientras llega la API
    if (usuario?.email) this.email = String(usuario.email);

    // 2) Llamada a /dataUser con finalize para bajar el loader SIEMPRE
    const body = { idUser };
    const url = `${this.apiBase}/dataUser`;
    console.log('[MainMenu] POST', url, body);

    this.http.post<any>(url, body)
      .pipe(
        finalize(() => {
          // siempre se ejecuta (éxito o error)
          this.cargando = false;
          this.cdr.detectChanges();
          console.log('[MainMenu] finalize -> cargando =', this.cargando);
        })
      )
      .subscribe({
        next: (res) => {
          console.log('[MainMenu] response ->', res);
          if (res?.status === 'success' && res?.data) {
            const d = res.data || {};
            this.nombre = String(d.name ?? d.nombre ?? '');
            if (!this.email) this.email = String(d.email ?? d.correo ?? '');
            console.log('[MainMenu] nombre=', this.nombre, ' email=', this.email);
          } else {
            this.errorMsg = res?.message || 'No se pudo cargar la información del usuario.';
            console.warn('[MainMenu] no success ->', res);
          }
        },
        error: (err) => {
          console.error('[MainMenu] ERROR /dataUser ->', err);
          this.errorMsg = 'Error contactando al servidor.';
        }
      });
  }

  cerrarSesion() {
    console.log('[MainMenu] cerrarSesion');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }

  tarjetas() {
    console.log('[MainMenu] /tarjetas');
    this.router.navigate(['/tarjetas']);
  }
}
