#include <cmath>
#include <iostream>

extern "C"
{
  float sor_step(
    float *V,
    bool  *is_electrode,
    int   m,
    int   n,
    float coefficient)
  {
    float delta;
  	float max_delta=0.0;

    for(size_t i = 1; i < m-1; i++) { for(size_t j = 1; j < n-1; j++) {
        if (!is_electrode[i*n + j]) {
          delta = coefficient*((V[(i-1)*n + j] + V[(i+1)*n + j] + V[i*n + (j-1)] + V[i*n + (j+1)])/4.0 - V[i*n + j]);
          V[i*n + j] += delta;
          delta = std::abs(delta);
          if (delta > max_delta) max_delta = delta;
        }
    }}

    return max_delta;
  }

  float sor(
  	float *V,
  	bool *is_electrode,
  	int   m,
  	int   n,
  	float coefficient,
  	int   maxiter,
  	float tol)
  {
  	if (coefficient >= 2 || coefficient < 1) {
      std::cerr << "ERROR: The SOR coefficient (omega) should be such that 1 <= omega <= 2." << '\n';
      throw std::invalid_argument("The SOR coefficient (omega) should be such that 1 <= omega <= 2.");
    }

  	float max_delta = tol + 1.0;
    float iters = 0;
    while(iters < maxiter && max_delta > tol) {
        max_delta = sor_step(V, is_electrode, m, n, coefficient);
        iters++;
    }

    std::cout << "Simulation complete." << '\n';
    std::cout << "Number of iterations: " << iters << ", Delta: " << max_delta << '\n';
    return max_delta;
  }

  // Calculate electric field approximating E = -∇V with
  // forward, backward, and central differences where appropiate.
  void electric_field(
    float *E_u,
    float *E_v,
    float *V,
    int   m,
    int   n)
  {
    // Reference:
    //    o : No component of E calculated.
    //    ━╸: x component calculated.
    //    ┃ : y component calculated.
    //    ┗╸: Both components calculated.

    // Center x-direction
    //
    // o   ━╸  ━╸   o
    // o   ━╸  ━╸   o
    // o   ━╸  ━╸   o
    // o   ━╸  ━╸   o
    //
    for (size_t i = 0; i < m; i++) { for (size_t j = 1; j < n-1; j++) {
      E_u[i*n + j] = (V[i*n + (j-1)] - V[i*n + (j+1)])/2.0;
    }}

    // Center y-direction
    //
    // o   ━╸  ━╸   o
    // ┃   ┗╸  ┗╸   ┃
    // ┃   ┗╸  ┗╸   ┃
    // o   ━╸  ━╸   o
    //
    for (size_t i = 1; i < m-1; i++) { for (size_t j = 0; j < n; j++) {
      E_v[i*n + j] = (V[(i-1)*n + j] - V[(i+1)*n + j])/2.0;
    }}

    // Sides x-direction
    //
    // ━╸  ━╸  ━╸  ━╸
    // ┗╸  ┗╸  ┗╸  ┗╸
    // ┗╸  ┗╸  ┗╸  ┗╸
    // ━╸  ━╸  ━╸  ━╸
    //
    for (size_t i = 0; i < m; i++) {
      E_u[i*n] = V[i*n] - V[i*n + 1];
      E_u[(i+1)*n - 1] = V[(i+1)*n - 2] - V[(i+1)*n - 1];
    }

    // Sides y-direction
    //
    // ┗╸  ┗╸  ┗╸  ┗╸
    // ┗╸  ┗╸  ┗╸  ┗╸
    // ┗╸  ┗╸  ┗╸  ┗╸
    // ┗╸  ┗╸  ┗╸  ┗╸
    //
    for (size_t j = 0; j < m; j++) {
      E_v[j] = V[j] - V[n + j];
      E_v[(m-1)*n + j] = V[(m-2)*n + j] - V[(m-1)*n + j];
    }
  }

}
