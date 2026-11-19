import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Info } from 'lucide-react';
import { login, register, requestPasswordReset, resetPassword } from '../core/services';
import { ALLOWED_EMAIL_DOMAINS, isInstitutionalEmail } from '../core/rules';
import { DEMO_ACCOUNTS } from '../core/seed';
import { Field } from '../components/ui';
import { useToast } from '../context/Toast';

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-brand"><span className="brand-logo">U</span></div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast(`Olá, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Entrar" subtitle="Acesse com seu e-mail institucional da SATC.">
      <form onSubmit={submit} className="form">
        {error && <div className="alert alert-error">{error}</div>}
        <Field label="E-mail institucional">
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@alunosatc.edu.br" />
        </Field>
        <Field label="Senha">
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="row between">
          <Link to="/recuperar-senha" className="small">Esqueci minha senha</Link>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <p className="center small">Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
      </form>

      <div className="demo-box">
        <strong><Info size={14} /> Contas de demonstração</strong>
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.email} type="button" className="demo-account" onClick={() => setForm({ email: a.email, password: a.password })}>
            <span>{a.label}</span>
            <small>{a.email} · {a.password}</small>
          </button>
        ))}
      </div>
    </AuthCard>
  );
}

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', role: 'aluno', course: '', phone: '', password: '', confirmPassword: '', acceptTerms: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const emailInvalid = form.email.includes('@') && !isInstitutionalEmail(form.email);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      toast('Conta criada com sucesso!');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Criar conta" subtitle="Exclusivo para alunos e professores da SATC.">
      <form onSubmit={submit} className="form">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="segmented">
          {[['aluno', 'Sou aluno'], ['professor', 'Sou professor']].map(([v, l]) => (
            <button type="button" key={v} className={form.role === v ? 'active' : ''} onClick={() => setForm({ ...form, role: v })}>{l}</button>
          ))}
        </div>
        <Field label="Nome completo">
          <input required value={form.name} onChange={set('name')} autoComplete="name" />
        </Field>
        <Field
          label="E-mail institucional"
          error={emailInvalid ? `Use um e-mail ${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(' ou ')}` : ''}
          hint={`Aceitos: ${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(', ')}`}
        >
          <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <div className="form-row">
          <Field label={form.role === 'aluno' ? 'Curso' : 'Departamento/Curso'}>
            <input value={form.course} onChange={set('course')} placeholder="Ex.: Engenharia de Software" />
          </Field>
          <Field label="Telefone (opcional)">
            <input value={form.phone} onChange={set('phone')} placeholder="(48) 99999-9999" autoComplete="tel" />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Senha" hint="Mínimo 6 caracteres">
            <input type="password" required minLength={6} value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Confirmar senha" error={form.confirmPassword && form.confirmPassword !== form.password ? 'As senhas não conferem' : ''}>
            <input type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} required />
          <span>Li e aceito as <Link to="/regras" target="_blank">regras da plataforma</Link> e a política de privacidade.</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</button>
        <p className="center small">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [demoCode, setDemoCode] = useState(null);
  const [form, setForm] = useState({ code: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const sendCode = (e) => {
    e.preventDefault();
    setError('');
    setDemoCode(requestPasswordReset(email));
    setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    try {
      await resetPassword(email, form.code, form.password);
      toast('Senha alterada! Faça login com a nova senha.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthCard title="Recuperar senha" subtitle={step === 1 ? 'Enviaremos um código para o seu e-mail institucional.' : `Digite o código enviado para ${email}.`}>
      {step === 1 ? (
        <form onSubmit={sendCode} className="form">
          <Field label="E-mail institucional">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button className="btn btn-primary btn-block"><Mail size={18} /> Enviar código</button>
          <p className="center small"><Link to="/login">Voltar ao login</Link></p>
        </form>
      ) : (
        <form onSubmit={submit} className="form">
          <div className="alert alert-info">
            Se existir uma conta com este e-mail, você receberá um código válido por 15 minutos.
            {demoCode && (
              <div className="demo-code">
                <small>Demonstração (sem servidor de e-mail):</small> <strong>{demoCode}</strong>
              </div>
            )}
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <Field label="Código de 6 dígitos">
            <input required inputMode="numeric" maxLength={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Nova senha">
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Confirmar nova senha">
            <input type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
          <button className="btn btn-primary btn-block"><KeyRound size={18} /> Redefinir senha</button>
          <button type="button" className="link-btn center" onClick={() => setStep(1)}>Usar outro e-mail</button>
        </form>
      )}
    </AuthCard>
  );
}
