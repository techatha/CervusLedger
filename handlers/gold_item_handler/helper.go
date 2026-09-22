package gold_item_handler

import (
	"regexp"
	"strconv"
)

var chunkRegexp = regexp.MustCompile(`(\d+|\D+)`)

// naturalLess compares two strings treating embedded numeric chunks numerically.
func naturalLess(s1, s2 string) bool {
	chunks1 := chunkRegexp.FindAllString(s1, -1)
	chunks2 := chunkRegexp.FindAllString(s2, -1)

	for i := 0; i < len(chunks1) && i < len(chunks2); i++ {
		c1, c2 := chunks1[i], chunks2[i]
		if c1 == c2 {
			continue
		}
		n1, err1 := strconv.Atoi(c1)
		n2, err2 := strconv.Atoi(c2)
		if err1 == nil && err2 == nil {
			return n1 < n2
		}
		return c1 < c2
	}
	return len(chunks1) < len(chunks2)
}
