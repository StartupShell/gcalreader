# gcalreader

gcalreader is a Cloudflare Worker that provides a public API for querying Google Calendar events. It is used
on the startupshell.org website which does not have a backend in order to nicely display upcoming events.

## Getting Started

First and foremost, `npm install`.

### Secrets

You will need to setup the following secrets:

-   `GOOGLE_CALENDAR_ID`
-   `GOOGLE_CREDENTIALS`

Place the values of these secrets in the file `.dev.vars` in `NAME=VALUE` format, for example:

```
GOOGLE_CALENDAR_ID=asdklfhasdfkjhasfjkh@group.calendar.google.com
GOOGLE_CREDENTIALS=askldfasdkjfhgasdfjkhgasdfkhjgasdkfjh....
```

#### `GOOGLE_CREDENTIALS`

This is the Base64 Hash of the Service Account credentials that will modify the Google Calendar.
Follow the steps to get this value:

1. Create a Service Account on the [Service Accounts Panel](https://console.cloud.google.com/iam-admin/serviceaccounts?project=multicalconnect)
2. Click on the Service Account, then go to the "Keys" tab
3. Click "Add Key" and choose "Create Existing Key". Choose a JSON key type and click "Create". A JSON file will download to your computer.
4. On your machine, run `cat <downloadedfile> | base64`. Copy this value to the `GOOGLE_CREDENTIALS` secret in `.dev.vars`.

#### `GOOGLE_CALENDAR_ID`

This the ID of the Google Calendar that the API will add events to. You can get the calendar ID by going to
the [Google Calendar Homepage](https://calendar.google.com/calendar/u/0/r/week), then click the three dots
on the calendar you want to add events, then click "Settings and sharing". Scroll down to "Integrate Calendar"
and copy the value under "Calendar ID". It will have the format of `<big hash>@group.calendar.google.com`.

**Important Additional Note**: In order for this Service Account to be able to actually modify the Google Calendar,
you need to share the calendar with the Service Account. To do so, find your Service Account's email (it's
in the format `<account name>@<project id>.iam.gserviceaccount.com`). Then, share the Calendar in the same
"Settings and sharing" page from the above instructions under "Share with specific people or groups". Ensure
to give the account at least the "Make changes to events" permission level.

### Booting

Simply run `npm run dev`!
