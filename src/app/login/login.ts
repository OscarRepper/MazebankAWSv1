import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  email: string = '';
  password: string = '';


  constructor(private router: Router, private http: HttpClient) { }

  login() {
    if (!this.email || !this.password) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    const datos = {
      email: this.email,
      password: this.password
    };

    const url = 'http://localhost:3001/login';

    this.http.post(url, datos).subscribe(
      (res: any) => {
        if (res.status === 'success') {

          localStorage.setItem('usuario', JSON.stringify({
            user_id: res.user_id,
            email: this.email,
            role_id: res.role_id
          }));

          if (res.role_id === 1) {
            this.router.navigate(['/main-menu']);
          }

          if (res.role_id === 2) {
            this.router.navigate(['/main-administrador']);
          }

          if (res.role_id === 3) {
            this.router.navigate(['/main-administrador']);
          }

          alert('Login exitoso');
        }
        else {
          alert(res.message);
        }
      },
      (err) => {
        console.error(err);
        alert('Error en el login. Intenta nuevamente.');
      }
    );
  }

}
