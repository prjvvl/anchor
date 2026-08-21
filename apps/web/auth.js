// Thin wrapper around the Supabase JS client (loaded via CDN <script> tag —
// see index.html/courses.html/course.html) for email-OTP sign-in. No DOM
// access here; UI wiring lives in helpers.js (initAuthControl()).
//
// Two distinct "supabase" globals exist: window.supabase is the CDN
// library namespace (has .createClient), ANCHOR_AUTH.client is the one
// instance we create from it.
const _client = window.supabase.createClient(window.ANCHOR_CONFIG.supabaseUrl, window.ANCHOR_CONFIG.supabasePublishableKey);

window.ANCHOR_AUTH = {
  client: _client,

  async sendOtp(email) {
    const { error } = await _client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return { error };
  },

  async verifyOtp(email, token) {
    const { data, error } = await _client.auth.verifyOtp({ email, token, type: "email" });
    return { data, error };
  },

  async signOut() {
    const { error } = await _client.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data, error } = await _client.auth.getSession();
    return { session: data?.session ?? null, error };
  },

  // Fires once immediately with any session restored from localStorage,
  // then again on every future sign-in/out/refresh — the single source of
  // truth the header UI renders from.
  onAuthStateChange(callback) {
    const { data } = _client.auth.onAuthStateChange((event, session) => callback(event, session));
    return data.subscription;
  },
};
