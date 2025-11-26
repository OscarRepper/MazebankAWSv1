import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { Tarjetas } from '../tarjetas/tarjetas';
import { routes } from '../app.routes';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [FormsModule, RouterModule, HttpClientModule],
  templateUrl: './historial.html',
  styleUrls: ['./historial.css']
})

export class Historial {

  idUser: string = '';


  constructor(private router: Router, private http: HttpClient) { }

  fechaCargo() {
    if (!this.idUser) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    const datos = {
      idUser: this.idUser
    };

    const url = 'http://localhost:3001/fechaCargo';

    this.http.post(url, datos).subscribe(
      (res: any) => {
        if (res.fecha) {

          localStorage.setItem('fechaCargo', JSON.stringify({
            fechaCargo: res.fecha
          }));

        }
        else {
          alert('ERROR');
        }
      },
      (err) => {
        console.error(err);
        alert('Error en el login. Intenta nuevamente.');
      }
    );
  }
}
