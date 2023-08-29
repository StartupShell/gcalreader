import { Hono } from "hono"
import { Credentials, getAuthToken } from "web-auth-library/google"
import { InferType, array, object, string } from "yup"
import { DateTime } from "luxon"
import { cors } from "hono/cors"

const CACHE_KEY = "cached_events"
const CACHE_EXPIRE_AFTER_SEC = 60 * 60

type Env = {
    GOOGLE_CALENDAR_ID: string
    GOOGLE_CREDENTIALS: string
    CACHE: KVNamespace
}
type ListItem = {
    title: string
    description?: string
    location?: string
    start: Date
    end: Date
}
type ListBody = ListItem[]

const gcalDateSchema = object({
    dateTime: string().required(),
    timeZone: string().required(),
})
const gcalEventItem = object({
    start: gcalDateSchema.required(),
    end: gcalDateSchema.required(),
    summary: string().required(),
    description: string().optional(),
    location: string().optional(),
})
const gcalListSchema = object({
    items: array().required(),
})

const parseGoogleCredentials = (raw: string): Credentials => {
    const decoded = atob(raw) as string
    return JSON.parse(decoded) as Credentials
}

const createAuthToken = (credentials: Credentials) =>
    getAuthToken({
        credentials,
        scope: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
    })

export default new Hono<{ Bindings: Env }>()
    .onError((err, ctx) => {
        console.error("uncaught error", err)
        return ctx.json({ error: "internal server error" }, 500)
    })
    .use("*", cors())
    .get("/list", async (ctx) => {
        const cachedResult = await ctx.env.CACHE.get(CACHE_KEY)
        if (cachedResult != null) {
            return ctx.text(cachedResult, 200)
        }

        console.log("cache miss")

        const token = await createAuthToken(parseGoogleCredentials(ctx.env.GOOGLE_CREDENTIALS))
        const params = new URLSearchParams({
            singleEvents: "true",
            showDeleted: "false",
            timeMin: new Date().toISOString(),
            orderBy: "startTime",
        })
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${ctx.env.GOOGLE_CALENDAR_ID}/events?${params}`,
            {
                method: "GET",
                headers: {
                    authorization: `Bearer ${token.accessToken}`,
                    "content-type": "application/json",
                    accept: "application/json",
                },
            }
        )
        if (response.status != 200) {
            console.error("failed to fetch events", await response.text())
            return ctx.json({ status: "fetching events failed" }, 500)
        }

        const responseJson = await response.json()
        let items
        try {
            const body = await gcalListSchema.validate(responseJson)
            const validatedItems = await Promise.allSettled(body.items.map((obj) => gcalEventItem.validate(obj)))
            validatedItems
                .filter(({ status }) => status == "rejected")
                .forEach((rejected) => console.warn("failed to parse event item", rejected))

            items = validatedItems
                .filter(({ status }) => status == "fulfilled")
                .map((result) => (result as PromiseFulfilledResult<InferType<typeof gcalEventItem>>).value)
        } catch (err) {
            console.log(JSON.stringify(responseJson))
            console.error("failed to parse gcal response", responseJson, err)
            return ctx.json({ status: "failed to parse events from google" }, 500)
        }

        const result: ListBody = items.slice(0, 11).map((item) => {
            const startDate = DateTime.fromISO(item.start.dateTime, { zone: item.start.timeZone }).toJSDate()
            const endDate = DateTime.fromISO(item.end.dateTime, { zone: item.end.timeZone }).toJSDate()
            return {
                title: item.summary,
                start: startDate,
                end: endDate,
                description: item.description,
                location: item.location,
            }
        })
        await ctx.env.CACHE.put(CACHE_KEY, JSON.stringify(result), { expirationTtl: CACHE_EXPIRE_AFTER_SEC })
        return ctx.json(result, 200)
    })
