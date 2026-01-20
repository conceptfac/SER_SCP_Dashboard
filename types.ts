
export enum UserRole {
  HEAD = 'HEAD',
  EXECUTIVO_LEADER = 'Executivo Leader',
  EXECUTIVO = 'Executivo',
  FINANCEIRO = 'Financeiro',
  CLIENTE = 'Cliente'
}

export type Language = 'en' | 'es' | 'pt-br';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  document: string;
  consultant: string;
  type: 'PF' | 'PJ';
  status: 'Apto' | 'Pendente' | 'Não Apto';
  email: string;
  phone: string;
  contracts: string[];
}

export interface Executive {
  id: string;
  name: string;
  document: string;
  email: string;
  role: string;
  leaderId?: string;
}

export interface Contract {
  id: string;
  number: string;
  status: 'Vigente' | 'Inativo' | 'Aguardando' | 'Cancelado';
  amount: number;
  rate: number;
  months: number;
  startDate: string;
  endDate: string;
  clientName: string;
  executiveName: string;
}

export interface SCPInfo {
  id: string;
  title: string;
  description: string;
  date: string;
  pdfUrl?: string;
}
