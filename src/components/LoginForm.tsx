"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import type { ActionResult } from "@/lib/types";
import Logo from "./Logo";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(loginAction, {});

  return (
    <div className="login-wrap">
      <form className="login-card" action={formAction}>
        <div className="brand">
          <span className="brand-logo">
            <Logo size={52} />
          </span>
          <span className="brand-copy">
            <strong>فروشگاه دوستان</strong>
            <small>پنل مدیریت</small>
          </span>
        </div>
        <h1>ورود مدیر</h1>
        <p>برای افزودن یا ویرایش بازی‌ها وارد شوید.</p>
        {state?.error ? <div className="alert error">{state.error}</div> : null}
        <div className="field">
          <label htmlFor="username">نام کاربری</label>
          <input id="username" name="username" type="text" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">رمز عبور</label>
          <input id="password" name="password" type="password" autoComplete="current-password" />
        </div>
        <div className="form-actions">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "در حال بررسی…" : "ورود"}
          </button>
          <a className="button ghost" href="/">بازگشت به سایت</a>
        </div>
      </form>
    </div>
  );
}