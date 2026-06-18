const searchInput = document.getElementById("searchInput");
const searchInput = document.getElementById("searchInput");
const table = document.getElementById("bookingTable");

searchInput.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    const rows = document.querySelectorAll("#bookingTable tbody tr");

    rows.forEach(row => {

        const text = row.textContent.toLowerCase();

        row.style.display =
            text.includes(value)
                ? ""
                : "none";

    });

})
searchInput.addEventListener("keyup", function () {

    const filter = searchInput.value.toLowerCase();
    const rows = table.getElementsByTagName("tr");

    for(let i = 1; i < rows.length; i++){

        let text = rows[i].textContent.toLowerCase();

        if(text.includes(filter)){
            rows[i].style.display = "";
        }
        else{
            rows[i].style.display = "none";
        }
    }
})

document
.getElementById("confirmBtn")
.addEventListener("click", () => {

    alert("Booking Successfully Submitted!");

})

searchInput.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    const rows = document.querySelectorAll("#customerTable tbody tr");

    rows.forEach(row => {

        const text = row.textContent.toLowerCase();

        row.style.display =
            text.includes(value)
                ? ""
                : "none";

    });

});
