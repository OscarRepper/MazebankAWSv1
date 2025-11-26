import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { routes } from '../app.routes';

@Component({
  selector: 'app-tarjetas',
  standalone: true,
  imports: [FormsModule, RouterModule, HttpClientModule],
  templateUrl: './tarjetas.html',
  styleUrl: './tarjetas.css'
})
export class Tarjetas {
  constructor(private router: Router, private http: HttpClient) { }

}