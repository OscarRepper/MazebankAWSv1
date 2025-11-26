import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

interface TransferResult {
  charge_id?: number;
  amount?: number;
  fee?: number;
  debited_total?: number;
  new_balance?: number;
  transaction_at?: string; // ISO o DATETIME del SP
}

interface TransferPayload {
  origin_card_id: number | string; // <-- permitir number porque origin_card_id en la clase es number|null
  beneficiary_name: string;
  beneficiary_account_ref: string;
  beneficiary_bank: string;
  amount: number;
  concept?: string;
}

@Component({
  selector: 'app-transferir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './transferir.component.html',
  styleUrls: ['./transferir.component.css']
})
export class TransferirComponent implements OnInit {
  // UI / estado
  cargando = false;
  errorMsg = '';
  successMsg = '';

  private apiBase = 'http://localhost:3001';

  // sesión
  userId: number | null = null;
  email = '';

  // formulario
  origin_card_id: number | null = null;
  beneficiary_name = '';
  beneficiary_account_ref = '';
  beneficiary_bank = '';
  amount: number | null = null;
  concept = '';
  transaction_at = ''; // YYYY-MM-DDTHH:mm o vacío => NOW() en el SP

  // respuesta del SP /transaction
  resultado: TransferResult | null = null;

  // Agregar una bandera para controlar si la transferencia ya se realizó
  transferenciaRealizada = false;

  // NUEVA PROPIEDAD: estado del envío de email
  enviandoEmail = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const raw = localStorage.getItem('usuario');
    let usuario: any = null;
    try { usuario = raw ? JSON.parse(raw) : null; } catch { usuario = null; }
    this.userId = Number(usuario?.user_id ?? usuario?.id ?? null);
    this.email = String(usuario?.email ?? '');

    if (!this.userId) {
      this.errorMsg = 'No hay sesión activa.';
      this.cdr.detectChanges();
      return;
    }
  }

  // Getters para vista
  get feeCalc(): number {
    return this.amount ? 5 : 0;
  }
  get amountSafe(): number {
    return this.amount ? +this.amount : 0;
  }
  get totalCalc(): number {
    return this.amountSafe + this.feeCalc;
  }

  private money(n: number | undefined | null): string {
    const v = typeof n === 'number' ? n : 0;
    return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  }
  private fmtDate(d: string | Date | undefined | null): string {
    const date = d ? new Date(d) : new Date();
    const f = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    return f.format(date);
  }

  private formatDateTime(date: Date): string {
    return date.toISOString()
      .replace('T', ' ')
      .replace(/\.\d+Z$/, '');
  }

  transferir(): void {
    if (!this.validateTransferData()) { return; }

    this.cargando = true;
    this.errorMsg = '';
    this.successMsg = '';

    const body = {
      origin_card_id: Number(this.origin_card_id),
      beneficiary_name: this.beneficiary_name,
      beneficiary_account_ref: this.beneficiary_account_ref,
      beneficiary_bank: this.beneficiary_bank,
      amount: Number(this.amount),
      concept: this.concept || 'Transferencia',
      transaction_at: this.formatDateTime(new Date()) // Formato MySQL: YYYY-MM-DD HH:mm:ss
    };

    console.log('[Transferir] Enviando datos:', body);

    this.http.post<any>(`${this.apiBase}/transaction`, body)
      .pipe(finalize(() => {
        this.cargando = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: any) => {
          console.log('[Transferir] Respuesta:', res);
          if (res?.status === 'success') {
            this.resultado = res.data;
            this.successMsg = res.message || 'Transferencia realizada con éxito';
            this.transferenciaRealizada = true;

            // Enviar comprobante por email automáticamente
            this.enviarComprobantePorEmail();

          } else {
            this.errorMsg = res?.message || 'Error al procesar la transferencia';
          }
        },
        error: (err: any) => {
          console.error('[Transferir] Error:', err);
          this.errorMsg = err.error?.message || 'Error al procesar la transferencia';
        }
      });
  }

  private validateTransferData(): boolean {
    if (!this.origin_card_id) {
      this.errorMsg = 'Seleccione una tarjeta de origen';
      return false;
    }
    if (!this.beneficiary_account_ref) {
      this.errorMsg = 'Ingrese la cuenta del beneficiario';
      return false;
    }
    if (!this.amount || this.amount <= 0) {
      this.errorMsg = 'Ingrese un monto válido';
      return false;
    }
    return true;
  }

  // Método para reiniciar el estado de la transferencia
  reiniciarTransferencia(): void {
    this.resultado = null;
    this.transferenciaRealizada = false;
    this.errorMsg = '';
    this.successMsg = '';
    // Limpiar otros campos del formulario
    this.beneficiary_name = '';
    this.beneficiary_account_ref = '';
    this.beneficiary_bank = '';
    this.amount = null;
    this.concept = '';
  }

  // Abre nueva pestaña/ventana con comprobante listo para imprimir/guardar como PDF
  abrirComprobante(): void {
    if (!this.resultado) {
      this.errorMsg = 'No hay comprobante disponible.';
      return;
    }

    const html = this.construirHtmlComprobante();
    const w = window.open('', '_blank', 'width=980,height=900');
    if (!w) {
      this.errorMsg = 'El navegador bloqueó la ventana de comprobante. Habilita pop-ups.';
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // w.onload = () => w.print(); // descomentar si quieres auto-imprimir
  }

  // REFACTORIZACIÓN: construir el HTML del comprobante para reusar en abrirComprobante y en el email
  private construirHtmlComprobante(): string {
    if (!this.resultado) return '';

    const r = this.resultado;
    const html = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Comprobante de Transferencia - MazeBank</title>
<style>
  :root { --c:#4d0101; --bg:#f7f7f7; --card:#ffffff; --txt:#111; --line:#eee; }
  body { font-family: Inter, system-ui, Arial, sans-serif; background: var(--bg); color: var(--txt); margin:0; padding:24px; }
  .wrap { max-width: 820px; margin: 0 auto; background: var(--card); border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.08); overflow: hidden; border:1px solid var(--line);}
  .hdr { padding: 16px 20px; background: var(--c); color: #fff; display:flex; align-items:center; justify-content:space-between; }
  .logo { font-weight: 800; letter-spacing: .5px; }
  .logo span { color:#ffdfdf; }
  .content { padding: 20px; }
  h2 { margin: 0 0 10px; font-size: 20px; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .card { border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
  .k { color:#666; font-size: 12px; margin-bottom:4px; text-transform: uppercase; letter-spacing: .4px; }
  .v { font-weight: 600; }
  .hr { height:1px; background:var(--line); margin:16px 0; }
  .foot { display:flex; align-items:center; justify-content:space-between; padding: 12px 20px; background:#fafafa; border-top:1px solid var(--line); }
  .btns { display:flex; gap:8px; }
  button { padding: 10px 14px; border-radius: 8px; border:1px solid #ddd; background:#fff; cursor:pointer; }
  button.primary { border-color: var(--c); background: var(--c); color:#fff; }
  @media (max-width:740px){ .grid { grid-template-columns: 1fr; } }
  @media print { .btns { display:none; } body { padding:0; background:#fff; } .wrap { box-shadow:none; border-radius:0; border:none; } }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap" rel="stylesheet">
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="logo">MAZE<span>BANK</span></div>
      <div><strong>Comprobante</strong></div>
    </div>

    <div class="content">
      <h2>Transferencia realizada</h2>

      <div class="grid">
        <div class="card">
          <div class="k">Folio / ID de cargo</div>
          <div class="v">${r.charge_id ?? ''}</div>

          <div class="k" style="margin-top:10px;">Fecha y hora</div>
          <div class="v">${this.fmtDate(r.transaction_at)}</div>

          <div class="k" style="margin-top:10px;">Tarjeta origen (ID)</div>
          <div class="v">${this.origin_card_id ?? ''}</div>

          <div class="k" style="margin-top:10px;">Concepto</div>
          <div class="v">${this.concept ? this.concept : '—'}</div>
        </div>

        <div class="card">
          <div class="k">Beneficiario</div>
          <div class="v">${this.beneficiary_name}</div>

          <div class="k" style="margin-top:10px;">Ref. / Cuenta beneficiario</div>
          <div class="v">${this.beneficiary_account_ref}</div>

          <div class="k" style="margin-top:10px;">Banco beneficiario</div>
          <div class="v">${this.beneficiary_bank || '—'}</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="grid">
        <div class="card">
          <div class="k">Monto</div>
          <div class="v">${this.money(Number(r.amount))}</div>
        </div>
        <div class="card">
          <div class="k">Comisión</div>
          <div class="v">${this.money(Number(r.fee))}</div>
        </div>
        <div class="card">
          <div class="k">Total debitado</div>
          <div class="v">${this.money(Number(r.debited_total))}</div>
        </div>
        <div class="card">
          <div class="k">Nuevo saldo</div>
          <div class="v">${this.money(Number(r.new_balance))}</div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="k">Generado para</div>
      <div class="v">${this.email || 'Usuario MazeBank'}</div>
    </div>

    <div class="foot">
      <small>© ${new Date().getFullYear()} MazeBank — Comprobante informativo.</small>
      <div class="btns">
        <button onclick="window.print()" class="primary">Imprimir / Guardar PDF</button>
        <button onclick="window.close()">Cerrar</button>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return html;
  }

  // Nueva función: enviar el comprobante por email usando el endpoint backend
  private enviarComprobantePorEmail(): void {
    if (!this.resultado || !this.email) {
      console.error('Faltan datos (resultado o email) para enviar el comprobante.');
      return;
    }

    this.enviandoEmail = true;
    const htmlBody = this.construirHtmlComprobante();
    const subject = `Comprobante de tu Transferencia #${this.resultado.charge_id}`;

    const emailPayload = {
      to_email: this.email,
      subject,
      htmlBody
    };

    this.http.post<any>(`${this.apiBase}/api/enviar-comprobante`, emailPayload)
      .pipe(finalize(() => {
        this.enviandoEmail = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: any) => {
          console.log('Respuesta de envío de email:', res);
          this.successMsg += ' - Comprobante enviado a tu correo.';
        },
        error: (err: any) => {
          console.error('Error al enviar el email:', err);
          this.errorMsg += ' | No se pudo enviar el comprobante por correo.';
        }
      });
  }

  // Modificar el método de navegación al menú
  irAlMenu(): void {
    this.reiniciarTransferencia();
    this.router.navigate(['/main-menu']);
  }
}
