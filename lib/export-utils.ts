/**
 * Converts an array of objects to CSV format
 * @param data Array of objects to convert
 * @param headers Optional custom headers (uses object keys if not provided)
 * @returns CSV string
 */
export function convertToCSV(data: any[], headers?: string[]) {
    if (data.length === 0) return ""
  
    // Use provided headers or extract from the first object
    const csvHeaders = headers || Object.keys(data[0])
  
    // Create header row
    let csv = csvHeaders.join(",") + "\n"
  
    // Add data rows
    data.forEach((item) => {
      const row = csvHeaders.map((header) => {
        // Get the value (using header as key or using a mapping)
        const value = headers ? item[header] : item[header]
  
        // Handle different value types
        if (value === null || value === undefined) {
          return ""
        } else if (typeof value === "string") {
          // Escape quotes and wrap in quotes if contains comma or quotes
          const escaped = value.replace(/"/g, '""')
          return /[",\n]/.test(value) ? `"${escaped}"` : escaped
        } else {
          return String(value)
        }
      })
  
      csv += row.join(",") + "\n"
    })
  
    return csv
  }
  
  /**
   * Triggers a download of data as a CSV file
   * @param data CSV string or array of objects
   * @param filename Filename for the download
   * @param headers Optional custom headers for array data
   */
  export function downloadCSV(data: string | any[], filename: string, headers?: string[]) {
    // Convert to CSV if data is an array
    const csvContent = typeof data === "string" ? data : convertToCSV(data, headers)
  
    // Create a Blob with the CSV data
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  
    // Create a download link
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
  
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
  
    // Append to the DOM, trigger the download, and clean up
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  