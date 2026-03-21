import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  const apiBase =
    (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(
      /\/+$/,
      "",
    );

  let storeName = "Local Farm";
  let location: string | null = null;
  let description: string | null = null;

  try {
    const res = await fetch(`${apiBase}/v1/stores/${storeId}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const store = (await res.json()) as {
        name: string;
        description: string | null;
        city?: string | null;
        region?: string | null;
      };
      storeName = store.name;
      if (store.city && store.region) {
        location = `${store.city}, ${store.region}`;
      } else if (store.city) {
        location = store.city;
      } else if (store.region) {
        location = store.region;
      }
      if (store.description) {
        description =
          store.description.length > 120
            ? store.description.slice(0, 117) + "..."
            : store.description;
      }
    }
  } catch {
    // Fall through to render a generic fallback image
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f6f1e8",
          position: "relative",
        }}
      >
        {/* Sage green accent bar at top */}
        <div
          style={{
            width: "100%",
            height: "8px",
            background:
              "linear-gradient(90deg, #2f6b4f 0%, #1f6c78 50%, #2f6b4f 100%)",
            display: "flex",
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "60px 80px 50px",
            justifyContent: "space-between",
          }}
        >
          {/* Top section: Store info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Store name */}
            <div
              style={{
                fontSize: storeName.length > 30 ? "56px" : "68px",
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                color: "#1c1b16",
                lineHeight: 1.1,
                maxWidth: "900px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {storeName}
            </div>

            {/* Location */}
            {location ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {/* Pin icon */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2f6b4f"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span
                  style={{
                    fontSize: "28px",
                    fontFamily: "system-ui, sans-serif",
                    color: "#4a463c",
                  }}
                >
                  {location}
                </span>
              </div>
            ) : null}

            {/* Description */}
            {description ? (
              <div
                style={{
                  fontSize: "22px",
                  fontFamily: "system-ui, sans-serif",
                  color: "#4a463c",
                  lineHeight: 1.5,
                  maxWidth: "800px",
                  marginTop: "8px",
                }}
              >
                {description}
              </div>
            ) : null}
          </div>

          {/* Bottom section: Branding + accent */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            {/* Local Roots branding */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  color: "#2f6b4f",
                }}
              >
                Local Roots
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontFamily: "system-ui, sans-serif",
                  color: "#4a463c",
                  letterSpacing: "0.05em",
                }}
              >
                Fresh from your local farm
              </div>
            </div>

            {/* Decorative leaf element */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2f6b4f"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21c-4-4-8-7.5-8-12a8 8 0 0 1 16 0c0 4.5-4 8-8 12Z" />
                <path d="M12 7v6" />
                <path d="M9 10h6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sage green accent bar at bottom */}
        <div
          style={{
            width: "100%",
            height: "6px",
            backgroundColor: "#2f6b4f",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
