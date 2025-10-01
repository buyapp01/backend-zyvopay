#!/usr/bin/env python3
"""
Celcoin BaaS Tester
Script para testes das APIs do BaaS da Celcoin em ambiente sandbox
Gera relatório markdown com resultados dos testes
"""

import os
import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
from colorama import init, Fore, Style
from tabulate import tabulate
from pydantic import BaseModel
import uuid
import time

# Inicializar colorama para cores no terminal
init()

# Carregar variáveis de ambiente
load_dotenv()

class TestResult:
    """Classe para armazenar resultados de teste"""
    def __init__(self, test_name: str, endpoint: str, method: str):
        self.test_name = test_name
        self.endpoint = endpoint
        self.method = method
        self.timestamp = datetime.now()
        self.request_payload: Optional[Dict] = None
        self.response_status: Optional[int] = None
        self.response_body: Optional[Dict] = None
        self.response_headers: Optional[Dict] = None
        self.execution_time: Optional[float] = None
        self.success: bool = False
        self.error_message: Optional[str] = None

class TestSession:
    """Classe para gerenciar sessão de testes"""
    def __init__(self):
        self.session_id = str(uuid.uuid4())[:8]
        self.start_time = datetime.now()
        self.results: List[TestResult] = []
        self.end_time: Optional[datetime] = None
        
    def add_result(self, result: TestResult):
        self.results.append(result)
        
    def finish(self):
        self.end_time = datetime.now()
        
    def get_duration(self) -> str:
        if self.end_time:
            duration = self.end_time - self.start_time
            return f"{duration.total_seconds():.2f}s"
        return "Em andamento"

class CelcoinConfig:
    """Configurações da API Celcoin"""
    BASE_URL = os.getenv("CELCOIN_BASE_URL", "https://sandbox.openfinance.celcoin.dev")
    CLIENT_ID = os.getenv("CELCOIN_CLIENT_ID")
    CLIENT_SECRET = os.getenv("CELCOIN_CLIENT_SECRET")
    
    def __init__(self):
        if not self.CLIENT_ID or not self.CLIENT_SECRET:
            raise ValueError("CLIENT_ID e CLIENT_SECRET devem ser configurados no arquivo .env")

class ReportGenerator:
    """Gerador de relatórios em Markdown"""
    
    @staticmethod
    def generate_report(session: TestSession) -> str:
        """Gera relatório completo em markdown"""
        
        report = f"""# 🏦 Relatório de Testes - Celcoin BaaS

## 📊 Resumo da Sessão

| Campo | Valor |
|-------|-------|
| **Session ID** | `{session.session_id}` |
| **Data/Hora Início** | {session.start_time.strftime('%d/%m/%Y %H:%M:%S')} |
| **Data/Hora Fim** | {session.end_time.strftime('%d/%m/%Y %H:%M:%S') if session.end_time else 'Em andamento'} |
| **Duração Total** | {session.get_duration()} |
| **Total de Testes** | {len(session.results)} |
| **Sucessos** | {len([r for r in session.results if r.success])} |
| **Falhas** | {len([r for r in session.results if not r.success])} |
| **Taxa de Sucesso** | {(len([r for r in session.results if r.success]) / len(session.results) * 100):.1f}% |

---

## 📋 Resultados Detalhados

"""

        for i, result in enumerate(session.results, 1):
            status_emoji = "✅" if result.success else "❌"
            
            report += f"""### {i}. {status_emoji} {result.test_name}

**Endpoint:** `{result.method} {result.endpoint}`  
**Timestamp:** {result.timestamp.strftime('%H:%M:%S')}  
**Status HTTP:** `{result.response_status}`  
**Tempo de Execução:** {result.execution_time:.3f}s  

"""

            if result.request_payload:
                report += f"""#### 📤 Request Payload
```json
{json.dumps(result.request_payload, indent=2, ensure_ascii=False)}
```

"""

            if result.response_body:
                report += f"""#### 📥 Response Body
```json
{json.dumps(result.response_body, indent=2, ensure_ascii=False)}
```

"""

            if result.response_headers:
                important_headers = {k: v for k, v in result.response_headers.items() 
                                   if k.lower() in ['content-type', 'x-ratelimit-remaining', 'x-request-id']}
                if important_headers: 
                    report += f"""#### 📋 Response Headers
```json
{json.dumps(important_headers, indent=2, ensure_ascii=False)}
```

"""

            if result.error_message:
                report += f"""#### ⚠️ Erro
```
{result.error_message}
```

"""

            report += "---\n\n"

        # Pipeline de execução
        report += """## 🔄 Pipeline de Execução

### Ordem Recomendada de Testes:

1. **Autenticação OAuth2** → Obter token de acesso
2. **DICT Lookup** → Validar chave PIX antes de transacionar
3. **Pagamento PIX** → Executar transação PIX
4. **Consulta Status PIX** → Verificar resultado da transação
5. **TED** → Transferência para outros bancos
6. **Transferência Interna** → Entre contas BaaS (mesmo cliente)

### 📈 Métricas de Performance

"""

        if session.results:
            avg_time = sum(r.execution_time or 0 for r in session.results) / len(session.results)
            fastest = min(r.execution_time or float('inf') for r in session.results)
            slowest = max(r.execution_time or 0 for r in session.results)
            
            report += f"""| Métrica | Valor |
|---------|-------|
| **Tempo Médio** | {avg_time:.3f}s |
| **Mais Rápido** | {fastest:.3f}s |
| **Mais Lento** | {slowest:.3f}s |

"""

        report += f"""---

## 🔧 Configuração do Ambiente

- **Base URL:** `{CelcoinConfig.BASE_URL}`
- **Ambiente:** Sandbox
- **Data do Relatório:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

---

*Relatório gerado automaticamente pelo Celcoin BaaS Tester*
"""

        return report

class CelcoinTester:
    """Classe principal para testes da API Celcoin"""
    
    def __init__(self):
        self.config = CelcoinConfig()
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.session = TestSession()
        
    def log_info(self, message: str):
        """Log colorido para informações"""
        print(f"{Fore.BLUE}[INFO]{Style.RESET_ALL} {message}")
        
    def log_success(self, message: str):
        """Log colorido para sucesso"""
        print(f"{Fore.GREEN}[SUCCESS]{Style.RESET_ALL} {message}")
        
    def log_error(self, message: str):
        """Log colorido para erros"""
        print(f"{Fore.RED}[ERROR]{Style.RESET_ALL} {message}")
        
    def log_warning(self, message: str):
        """Log colorido para warnings"""
        print(f"{Fore.YELLOW}[WARNING]{Style.RESET_ALL} {message}")

    def _make_request(self, method: str, url: str, payload: Optional[Dict] = None, 
                     params: Optional[Dict] = None, test_name: str = "") -> TestResult:
        """Método unificado para fazer requisições e registrar resultados"""
        
        result = TestResult(test_name, url.replace(self.config.BASE_URL, ""), method)
        result.request_payload = payload
        
        start_time = time.time()
        
        try:
            headers = self.get_headers() if self.access_token else {"Content-Type": "application/json"}
            
            if method.upper() == "POST":
                response = requests.post(url, headers=headers, json=payload)
            elif method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=payload)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Método HTTP não suportado: {method}")
            
            result.execution_time = time.time() - start_time
            result.response_status = response.status_code
            result.response_headers = dict(response.headers)
            
            try:
                result.response_body = response.json()
            except:
                result.response_body = {"raw_response": response.text}
            
            result.success = response.status_code in [200, 201, 202]
            
            if not result.success:
                result.error_message = f"HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            result.execution_time = time.time() - start_time
            result.success = False
            result.error_message = str(e)
            
        self.session.add_result(result)
        return result

    def authenticate(self) -> bool:
        """Autenticação OAuth2 Client Credentials"""
        try:
            self.log_info("Iniciando autenticação OAuth2...")
            
            url = f"{self.config.BASE_URL}/v5/token"
            data = {
                "client_id": self.config.CLIENT_ID,
                "client_secret": self.config.CLIENT_SECRET,
                "grant_type": "client_credentials"
            }
            
            # Requisição especial para autenticação (form-data)
            response = requests.post(url, data=data)
            
            result = TestResult("Autenticação OAuth2", "/v5/token", "POST")
            result.request_payload = {"client_id": "***", "grant_type": "client_credentials"}
            result.response_status = response.status_code
            result.response_headers = dict(response.headers)
            
            if response.status_code == 200:
                token_data = response.json()
                result.response_body = {"access_token": "***", "expires_in": token_data.get("expires_in")}
                result.success = True
                
                self.access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 3600)
                
                self.log_success(f"Autenticação realizada com sucesso! Token válido por {expires_in}s")
                self.session.add_result(result)
                return True
            else:
                result.response_body = response.json() if response.text else {}
                result.success = False
                result.error_message = f"Erro na autenticação: {response.status_code}"
                
                self.log_error(f"Erro na autenticação: {response.status_code} - {response.text}")
                self.session.add_result(result)
                return False
                
        except Exception as e:
            self.log_error(f"Exceção durante autenticação: {str(e)}")
            return False

    def get_headers(self) -> Dict[str, str]:
        """Retorna headers padrão com token de autenticação"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def test_pix_dict_lookup(self, pix_key: str, key_type: str) -> Optional[Dict]:
        """Testa consulta DICT para uma chave PIX"""
        self.log_info(f"Testando DICT lookup para chave: {pix_key} (tipo: {key_type})")
        
        url = f"{self.config.BASE_URL}/pix/v1/dict/v2/key"
        payload = {
            "key": pix_key,
            "keyType": key_type
        }
        
        result = self._make_request("POST", url, payload, test_name=f"DICT Lookup - {key_type}")
        
        if result.success:
            self.log_success("DICT lookup realizado com sucesso!")
            return result.response_body
        else:
            self.log_error(f"Erro no DICT lookup: {result.error_message}")
            return None

    def test_pix_payment(self, amount: float, pix_key: str, key_type: str, 
                        client_code: str, description: str) -> Optional[Dict]:
        """Testa pagamento PIX"""
        self.log_info(f"Testando pagamento PIX de R$ {amount:.2f}")
        
        url = f"{self.config.BASE_URL}/pix/v1/payment"
        payload = {
            "amount": amount,
            "receiver": {
                "key": pix_key,
                "keyType": key_type
            },
            "clientCode": client_code,
            "description": description,
            "urgency": "HIGH",
            "initiationType": "MANUAL"
        }
        
        result = self._make_request("POST", url, payload, test_name=f"Pagamento PIX - R$ {amount:.2f}")
        
        if result.success:
            self.log_success("Pagamento PIX iniciado com sucesso!")
            return result.response_body
        else:
            self.log_error(f"Erro no pagamento PIX: {result.error_message}")
            return None

    def test_pix_status(self, transaction_id: str) -> Optional[Dict]:
        """Consulta status de transação PIX"""
        self.log_info(f"Consultando status da transação: {transaction_id}")
        
        url = f"{self.config.BASE_URL}/pix/v1/payment/status"
        params = {"transactionId": transaction_id}
        
        result = self._make_request("GET", url, params=params, test_name=f"Status PIX - {transaction_id[:8]}...")
        
        if result.success:
            self.log_success("Status da transação consultado com sucesso!")
            return result.response_body
        else:
            self.log_error(f"Erro na consulta de status: {result.error_message}")
            return None

    def test_ted_transfer(self, amount: float, bank_code: str, agency: str, 
                         account: str, recipient_name: str, recipient_doc: str,
                         client_code: str) -> Optional[Dict]:
        """Testa transferência TED"""
        self.log_info(f"Testando TED de R$ {amount:.2f}")
        
        url = f"{self.config.BASE_URL}/v5/transactions/banktransfer"
        payload = {
            "amount": amount,
            "clientCode": client_code,
            "bank": {
                "bankCode": bank_code,
                "agency": agency,
                "account": account
            },
            "recipient": {
                "name": recipient_name,
                "document": recipient_doc
            },
            "purpose": "01",  # Crédito em conta corrente
            "description": "Teste TED via API"
        }
        
        result = self._make_request("POST", url, payload, test_name=f"TED Transfer - R$ {amount:.2f}")
        
        if result.success:
            self.log_success("TED iniciada com sucesso!")
            return result.response_body
        else:
            self.log_error(f"Erro na TED: {result.error_message}")
            return None

    def test_internal_transfer(self, amount: float, debit_account: str, credit_account: str,
                              client_code: str, description: str) -> Optional[Dict]:
        """Testa transferência interna BaaS"""
        self.log_info(f"Testando transferência interna de R$ {amount:.2f}")
        
        url = f"{self.config.BASE_URL}/baas-wallet-transactions-webservice/v1/wallet/internal/transfer"
        payload = {
            "amount": amount,
            "clientRequestId": client_code,
            "debitParty": {
                "account": debit_account
            },
            "creditParty": {
                "account": credit_account
            },
            "description": description
        }
        
        result = self._make_request("POST", url, payload, test_name=f"Transferência Interna - R$ {amount:.2f}")
        
        if result.success:
            self.log_success("Transferência interna iniciada com sucesso!")
            return result.response_body
        else:
            self.log_error(f"Erro na transferência interna: {result.error_message}")
            return None

    def display_result(self, title: str, result: Dict):
        """Exibe resultado formatado"""
        print(f"\n{Fore.CYAN}=== {title} ==={Style.RESET_ALL}")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print()

    def save_report(self):
        """Salva relatório markdown"""
        self.session.finish()
        report_content = ReportGenerator.generate_report(self.session)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"celcoin_test_report_{timestamp}.md"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            self.log_success(f"Relatório salvo em: {filename}")
            print(f"\n{Fore.MAGENTA}📊 Relatório completo disponível em: {filename}{Style.RESET_ALL}")
            
        except Exception as e:
            self.log_error(f"Erro ao salvar relatório: {str(e)}")

    def run_pipeline_test(self):
        """Executa pipeline completo de testes"""
        print(f"{Fore.MAGENTA}{'='*70}")
        print(f"🔄 EXECUTANDO PIPELINE COMPLETO DE TESTES")
        print(f"{'='*70}{Style.RESET_ALL}\n")
        
        # 1. Autenticação
        if not self.authenticate():
            self.log_error("Pipeline interrompido - falha na autenticação")
            return
        
        # 2. DICT Lookup
        self.log_info("Executando DICT Lookup...")
        pix_key = "test@example.com"
        self.test_pix_dict_lookup(pix_key, "EMAIL")
        
        # 3. Pagamento PIX (simulado)
        self.log_info("Executando Pagamento PIX...")
        client_code = f"TEST_{uuid.uuid4().hex[:8]}"
        self.test_pix_payment(10.50, pix_key, "EMAIL", client_code, "Teste automatizado")
        
        # 4. Consulta Status (exemplo)
        self.log_info("Executando Consulta Status...")
        self.test_pix_status("123456789")
        
        # 5. TED
        self.log_info("Executando TED...")
        ted_client_code = f"TED_{uuid.uuid4().hex[:8]}"
        self.test_ted_transfer(100.00, "001", "1234", "12345-6", "João Silva", "12345678901", ted_client_code)
        
        print(f"\n{Fore.GREEN}✅ Pipeline completo executado!{Style.RESET_ALL}")
        print(f"{Fore.CYAN}📊 Total de testes: {len(self.session.results)}{Style.RESET_ALL}")

    def run_interactive_test(self):
        """Executa teste interativo"""
        print(f"{Fore.MAGENTA}{'='*60}")
        print(f"🏦 CELCOIN BaaS TESTER - AMBIENTE SANDBOX 🏦")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        
        # Autenticação
        if not self.authenticate():
            return
        
        while True:
            print(f"\n{Fore.CYAN}Opções disponíveis:")
            print("1. Teste DICT Lookup (consulta chave PIX)")
            print("2. Teste Pagamento PIX")
            print("3. Consulta Status PIX")
            print("4. Teste TED")
            print("5. Teste Transferência Interna")
            print("6. Executar Pipeline Completo")
            print("7. Gerar Relatório e Sair")
            print("8. Sair sem relatório")
            print(f"{Style.RESET_ALL}")
            
            choice = input("Escolha uma opção (1-8): ").strip()
            
            if choice == "1":
                print(f"\n{Fore.YELLOW}=== TESTE DICT LOOKUP ==={Style.RESET_ALL}")
                pix_key = input("Digite a chave PIX: ").strip()
                print("Tipos disponíveis: CPF, CNPJ, EMAIL, PHONE, EVP")
                key_type = input("Digite o tipo da chave: ").strip().upper()
                
                result = self.test_pix_dict_lookup(pix_key, key_type)
                if result:
                    self.display_result("DICT LOOKUP RESULT", result)
                    
            elif choice == "2":
                print(f"\n{Fore.YELLOW}=== TESTE PAGAMENTO PIX ==={Style.RESET_ALL}")
                amount = float(input("Digite o valor (ex: 10.50): "))
                pix_key = input("Digite a chave PIX destino: ").strip()
                print("Tipos disponíveis: CPF, CNPJ, EMAIL, PHONE, EVP")
                key_type = input("Digite o tipo da chave: ").strip().upper()
                client_code = input("Digite um código único do cliente: ").strip()
                description = input("Digite a descrição: ").strip()
                
                result = self.test_pix_payment(amount, pix_key, key_type, client_code, description)
                if result:
                    self.display_result("PAGAMENTO PIX RESULT", result)
                    
            elif choice == "3":
                print(f"\n{Fore.YELLOW}=== CONSULTA STATUS PIX ==={Style.RESET_ALL}")
                transaction_id = input("Digite o transaction ID: ").strip()
                
                result = self.test_pix_status(transaction_id)
                if result:
                    self.display_result("STATUS PIX RESULT", result)
                    
            elif choice == "4":
                print(f"\n{Fore.YELLOW}=== TESTE TED ==={Style.RESET_ALL}")
                amount = float(input("Digite o valor (ex: 100.00): "))
                bank_code = input("Digite o código do banco (ex: 001): ").strip()
                agency = input("Digite a agência (ex: 1234): ").strip()
                account = input("Digite a conta (ex: 12345-6): ").strip()
                recipient_name = input("Digite o nome do destinatário: ").strip()
                recipient_doc = input("Digite o CPF/CNPJ do destinatário: ").strip()
                client_code = input("Digite um código único do cliente: ").strip()
                
                result = self.test_ted_transfer(amount, bank_code, agency, account, 
                                              recipient_name, recipient_doc, client_code)
                if result:
                    self.display_result("TED RESULT", result)
                    
            elif choice == "5":
                print(f"\n{Fore.YELLOW}=== TESTE TRANSFERÊNCIA INTERNA ==={Style.RESET_ALL}")
                amount = float(input("Digite o valor (ex: 50.00): "))
                debit_account = input("Digite a conta de débito: ").strip()
                credit_account = input("Digite a conta de crédito: ").strip()
                client_code = input("Digite um código único do cliente: ").strip()
                description = input("Digite a descrição: ").strip()
                
                result = self.test_internal_transfer(amount, debit_account, credit_account, 
                                                   client_code, description)
                if result:
                    self.display_result("TRANSFERÊNCIA INTERNA RESULT", result)
                    
            elif choice == "6":
                self.run_pipeline_test()
                
            elif choice == "7":
                self.save_report()
                break
                
            elif choice == "8":
                self.log_info("Encerrando sem gerar relatório...")
                break
                
            else:
                self.log_warning("Opção inválida. Tente novamente.")

def main():
    """Função principal"""
    try:
        tester = CelcoinTester()
        
        print(f"{Fore.CYAN}Modo de execução:")
        print("1. Interativo (escolher testes manualmente)")
        print("2. Pipeline automático (executar sequência completa)")
        print(f"{Style.RESET_ALL}")
        
        mode = input("Escolha o modo (1-2): ").strip()
        
        if mode == "2":
            tester.run_pipeline_test()
            tester.save_report()
        else:
            tester.run_interactive_test()
            
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}[INFO]{Style.RESET_ALL} Teste interrompido pelo usuário")
    except Exception as e:
        print(f"{Fore.RED}[ERROR]{Style.RESET_ALL} Erro inesperado: {str(e)}")

if __name__ == "__main__":
    main()