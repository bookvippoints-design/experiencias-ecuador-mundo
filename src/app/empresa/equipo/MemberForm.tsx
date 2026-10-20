"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { TeamFormState } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn-orange btn-wide" disabled={pending}>{pending ? "Guardando..." : label}</button>;
}

interface Initial {
  name?: string;
  email?: string;
  role?: "admin" | "member";
  department?: string | null;
  dailyLimit?: number | null;
}

/** Formulario para agregar o editar una persona del equipo. */
export function MemberForm({ action, departments, initial, isNew }: {
  action: (prev: TeamFormState, formData: FormData) => Promise<TeamFormState>;
  departments: string[];
  initial?: Initial;
  isNew: boolean;
}) {
  const [state, formAction] = useActionState(action, { error: null, success: null });
  const [role, setRole] = useState<"admin" | "member">(initial?.role ?? "member");
  const [mode, setMode] = useState<"daily" | "unlimited">(initial && initial.dailyLimit === null && initial.role === "member" ? "unlimited" : "daily");
  const [otherDept, setOtherDept] = useState(false);
  const deptList = initial?.department && !departments.includes(initial.department) ? [...departments, initial.department] : departments;

  return (
    <form action={formAction} className="team-form" key={isNew ? state.success ?? "f" : "f"}>
      {isNew ? (
        <>
          <div className="field"><label htmlFor="name">Nombre y apellido</label><input id="name" name="name" required defaultValue={initial?.name} /></div>
          <div className="field"><label htmlFor="email">Correo de trabajo</label><input id="email" name="email" type="email" required defaultValue={initial?.email} /></div>
        </>
      ) : (
        <p className="summary-line"><strong>{initial?.name}</strong><br />{initial?.email}</p>
      )}

      <fieldset className="choice-box">
        <legend>¿Qué puede hacer?</legend>
        <label className="radio-line">
          <input type="radio" name="role" value="member" checked={role === "member"} onChange={() => setRole("member")} />
          <span><strong>Usuario del departamento</strong><br /><small>Crea accesos para clientes y ve solo los suyos.</small></span>
        </label>
        <label className="radio-line">
          <input type="radio" name="role" value="admin" checked={role === "admin"} onChange={() => setRole("admin")} />
          <span><strong>Administrador</strong><br /><small>Maneja el equipo, sus límites y ve todos los accesos. No compra cupos.</small></span>
        </label>
      </fieldset>

      <div className="field">
        <label htmlFor="department">Departamento{role === "admin" ? " (opcional)" : ""}</label>
        {!otherDept ? (
          <select id="department" name="department" defaultValue={initial?.department ?? (role === "admin" ? "" : deptList[0] ?? "")}>
            {role === "admin" && <option value="">Sin departamento</option>}
            {deptList.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input id="department" name="new_department" placeholder="Nombre del departamento" required={role === "member"} autoFocus />
        )}
        <button type="button" className="link-button" onClick={() => setOtherDept((v) => !v)}>
          {otherDept ? "Elegir de la lista" : "+ Otro departamento"}
        </button>
      </div>

      {role === "member" && (
        <fieldset className="choice-box">
          <legend>¿Cuántos accesos puede crear?</legend>
          <label className="radio-line radio-line--inline">
            <input type="radio" name="limit_mode" value="daily" checked={mode === "daily"} onChange={() => setMode("daily")} />
            <strong>Límite diario:</strong>
            <input aria-label="Accesos por día" name="daily_limit" type="number" min={0} max={10000} inputMode="numeric"
              defaultValue={initial?.dailyLimit ?? 5} className="num-input" onFocus={() => setMode("daily")} />
            <span>por día</span>
          </label>
          <label className="radio-line">
            <input type="radio" name="limit_mode" value="unlimited" checked={mode === "unlimited"} onChange={() => setMode("unlimited")} />
            <span><strong>Sin límite (de confianza)</strong><br /><small>Crea todos los que necesite mientras la empresa tenga saldo.</small></span>
          </label>
          <small className="field-hint">El límite se reinicia cada día a la medianoche (hora de Ecuador).</small>
        </fieldset>
      )}

      {isNew && <p className="field-hint">Le enviaremos un correo de invitación para que active su cuenta y cree su contraseña. Agregar personas al equipo no usa cupos.</p>}
      {state.error && <p className="field-error">{state.error}</p>}
      {state.success && <p className="success-box">{state.success}</p>}
      <Submit label={isNew ? "Enviar invitación" : "Guardar cambios"} />
      <Link href="/empresa/equipo" className="text-link-center">{state.success ? "Volver a mi equipo" : "Cancelar"}</Link>
    </form>
  );
}
