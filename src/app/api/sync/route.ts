import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: clients } = await supabase.from('clients').select('*')
  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No clients found' })
  }

  const results = []

  for (const client of clients) {
    try {
      let row: Record<string, string | number | null> = {
        date: getYesterday(),
      }

      if (client.device === 'whoop' || client.device === 'both') {
        if (!client.whoop_access_token) continue
        const token = await refreshWhoopTokenIfNeeded(client)
        const whoopData = await fetchWhoopData(token)
        row = { ...row, ...whoopData }
      }

      if (client.device === 'oura' || client.device === 'both') {
        if (!client.oura_access_token) continue
        const ouraData = await fetchOuraData(client.oura_access_token)
        row = { ...row, ...ouraData }
      }

      if (client.google_sheet_id) {
        await appendToSheet(client.google_sheet_id, row)
      }

      results.push({ client: client.id, status: 'ok' })
    } catch (err) {
      results.push({ client: client.id, status: 'error', error: String(err) })
    }
  }

  return NextResponse.json({ results })
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

async function refreshWhoopTokenIfNeeded(client: Record<string, string>): Promise<string> {
  const expiresAt = new Date(client.whoop_token_expires_at)
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return client.whoop_access_token
  }

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: client.whoop_refresh_token,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  })

  const tokens = await res.json()
  const expiresAtNew = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('clients')
    .update({
      whoop_access_token: tokens.access_token,
      whoop_refresh_token: tokens.refresh_token,
      whoop_token_expires_at: expiresAtNew,
    })
    .eq('id', client.id)

  return tokens.access_token
}

async function fetchWhoopData(token: string): Promise<Record<string, string | number | null>> {
  const yesterday = getYesterday()
  const start = `${yesterday}T00:00:00.000Z`
  const end = `${yesterday}T23:59:59.000Z`

  const headers = { Authorization: `Bearer ${token}` }

  const [recoveryRes, sleepRes, cycleRes, workoutRes] = await Promise.all([
    fetch(`https://api.prod.whoop.com/developer/v1/recovery?start=${start}&end=${end}`, { headers }),
    fetch(`https://api.prod.whoop.com/developer/v1/activity/sleep?start=${start}&end=${end}`, { headers }),
    fetch(`https://api.prod.whoop.com/developer/v1/cycle?start=${start}&end=${end}`, { headers }),
    fetch(`https://api.prod.whoop.com/developer/v1/activity/workout?start=${start}&end=${end}`, { headers }),
  ])

  const [recoveryData, sleepData, cycleData, workoutData] = await Promise.all([
    recoveryRes.json(),
    sleepRes.json(),
    cycleRes.json(),
    workoutRes.json(),
  ])

  const recovery = recoveryData?.records?.[0]?.score ?? {}
  const sleep = sleepData?.records?.find((r: Record<string, boolean>) => !r.nap)
  const sleepScore = sleep?.score ?? {}
  const sleepStages = sleep?.stage_summary ?? {}
  const sleepNeeded = sleep?.sleep_needed ?? {}
  const cycle = cycleData?.records?.[0]?.score ?? {}
  const workout = workoutData?.records?.[0]

  const msToHours = (ms: number | null) =>
    ms != null ? Math.round((ms / 3600000) * 100) / 100 : null

  const msToMinutes = (ms: number | null) =>
    ms != null ? Math.round(ms / 60000) : null

  return {
    whoop_recovery_score: recovery.recovery_score ?? null,
    whoop_rhr: recovery.resting_heart_rate ?? null,
    whoop_hrv_rmssd: recovery.hrv_rmssd_milli ?? null,
    whoop_spo2: recovery.spo2_percentage ?? null,
    whoop_skin_temp: recovery.skin_temp_celsius ?? null,
    whoop_sleep_score: sleepScore.sleep_performance_percentage ?? null,
    whoop_total_sleep_h: msToHours(sleepStages.total_in_bed_time_milli - sleepStages.total_awake_time_milli),
    whoop_sleep_efficiency: sleepScore.sleep_efficiency_percentage ?? null,
    whoop_deep_sleep_h: msToHours(sleepStages.total_slow_wave_sleep_time_milli),
    whoop_rem_sleep_h: msToHours(sleepStages.total_rem_sleep_time_milli),
    whoop_light_sleep_h: msToHours(sleepStages.total_light_sleep_time_milli),
    whoop_awake_h: msToHours(sleepStages.total_awake_time_milli),
    whoop_disturbances: sleepStages.disturbance_count ?? null,
    whoop_sleep_cycles: sleepStages.sleep_cycle_count ?? null,
    whoop_resp_rate: sleepScore.respiratory_rate ?? null,
    whoop_sleep_consistency: sleepScore.sleep_consistency_percentage ?? null,
    whoop_sleep_debt_h: msToHours(sleepNeeded.need_from_sleep_debt_milli),
    whoop_day_strain: cycle.strain ?? null,
    whoop_avg_hr: cycle.average_heart_rate ?? null,
    whoop_max_hr: cycle.max_heart_rate ?? null,
    whoop_calories_kj: cycle.kilojoule ?? null,
    whoop_workout_type: workout?.sport_name ?? null,
    whoop_workout_strain: workout?.score?.strain ?? null,
    whoop_workout_avg_hr: workout?.score?.average_heart_rate ?? null,
    whoop_workout_max_hr: workout?.score?.max_heart_rate ?? null,
    whoop_zone1_min: msToMinutes(workout?.score?.zone_duration?.zone_one_milli),
    whoop_zone2_min: msToMinutes(workout?.score?.zone_duration?.zone_two_milli),
    whoop_zone3_min: msToMinutes(workout?.score?.zone_duration?.zone_three_milli),
    whoop_zone4_min: msToMinutes(workout?.score?.zone_duration?.zone_four_milli),
    whoop_zone5_min: msToMinutes(workout?.score?.zone_duration?.zone_five_milli),
  }
}

async function fetchOuraData(token: string): Promise<Record<string, string | number | null>> {
  const yesterday = getYesterday()
  const headers = { Authorization: `Bearer ${token}` }

  const [readinessRes, sleepRes, activityRes] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${yesterday}&end_date=${yesterday}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${yesterday}&end_date=${yesterday}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${yesterday}&end_date=${yesterday}`, { headers }),
  ])

  const [readinessData, sleepData, activityData] = await Promise.all([
    readinessRes.json(),
    sleepRes.json(),
    activityRes.json(),
  ])

  const readiness = readinessData?.data?.[0] ?? {}
  const sleep = sleepData?.data?.[0] ?? {}
  const activity = activityData?.data?.[0] ?? {}

  const secToHours = (s: number | null) =>
    s != null ? Math.round((s / 3600) * 100) / 100 : null

  return {
    oura_readiness_score: readiness.score ?? null,
    oura_rhr: readiness.contributors?.resting_heart_rate ?? null,
    oura_hrv_avg: sleep.average_hrv ?? null,
    oura_spo2_avg: sleep.average_spo2 ?? null,
    oura_body_temp_deviation: readiness.temperature_deviation ?? null,
    oura_sleep_score: sleep.score ?? null,
    oura_total_sleep_h: secToHours(sleep.total_sleep_duration),
    oura_sleep_efficiency: sleep.efficiency ?? null,
    oura_deep_sleep_h: secToHours(sleep.deep_sleep_duration),
    oura_rem_sleep_h: secToHours(sleep.rem_sleep_duration),
    oura_light_sleep_h: secToHours(sleep.light_sleep_duration),
    oura_awake_h: secToHours(sleep.awake_time),
    oura_resp_rate: sleep.average_breath ?? null,
    oura_activity_score: activity.score ?? null,
    oura_steps: activity.steps ?? null,
    oura_calories: activity.active_calories ?? null,
  }
}

async function appendToSheet(sheetId: string, row: Record<string, string | number | null>) {
  const { google } = await import('googleapis')

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  const values = [Object.values(row)]

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:A',
    valueInputOption: 'RAW',
    requestBody: { values },
  })
}