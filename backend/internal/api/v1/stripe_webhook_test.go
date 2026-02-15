package v1

import (
	"testing"
)

func TestSplitWebhookSecrets(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  []string
	}{
		{
			name:  "comma separated",
			input: "a,b,c",
			want:  []string{"a", "b", "c"},
		},
		{
			name:  "newline separated",
			input: "a\nb\nc",
			want:  []string{"a", "b", "c"},
		},
		{
			name:  "empty string",
			input: "",
			want:  nil,
		},
		{
			name:  "whitespace and empty parts",
			input: "  , ,  ",
			want:  nil,
		},
		{
			name:  "trimmed values",
			input: " a , b ",
			want:  []string{"a", "b"},
		},
		{
			name:  "mixed comma and newline",
			input: "x\ny,z",
			want:  []string{"x", "y", "z"},
		},
		{
			name:  "single secret",
			input: "whsec_abc123",
			want:  []string{"whsec_abc123"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := splitWebhookSecrets(tc.input)
			if len(got) != len(tc.want) {
				t.Fatalf("len: got %d want %d (got %v)", len(got), len(tc.want), got)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Fatalf("index %d: got %q want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}
