import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateWeightedIndicator, classifySegment, successRiskFlags } from '../src/lib/scoring.ts'

test('weighted score uses configured weights and explains each contribution',()=>{
 const result=calculateWeightedIndicator({academic:80,attendance:60},{academic:40,attendance:60},60)
 assert.equal(result.score,68)
 assert.equal(result.status,'available')
 assert.equal(result.coverage,100)
 assert.equal(result.contributions.academic,32)
 assert.equal(result.contributions.attendance,36)
})
test('missing components are not zero; available weight is renormalized and marked provisional',()=>{
 const result=calculateWeightedIndicator({academic:80,attendance:null},{academic:40,attendance:60},40)
 assert.equal(result.score,80)
 assert.equal(result.status,'provisional')
 assert.equal(result.coverage,40)
 assert.equal(result.contributions.attendance,null)
})
test('insufficient coverage produces unavailable score instead of zero',()=>{
 const result=calculateWeightedIndicator({skills:90,assessment:null},{skills:40,assessment:60},60)
 assert.equal(result.score,null)
 assert.equal(result.status,'insufficient_data')
})
test('rule flags use transparent configurable strict threshold comparisons',()=>{
 const flags=successRiskFlags({academic:49,attendance:75,engagementDropPercent:20,skill:59,coverage:60})
 assert.deepEqual(flags.map(x=>x.key),['academic_support','engagement_decline','skill_development'])
 const changed=successRiskFlags({academic:55,attendance:70,engagementDropPercent:10,skill:70,coverage:50,thresholds:{attendanceLow:80,minimumCoverage:40}})
 assert.deepEqual(changed.map(x=>x.key),['attendance_support'])
})
test('segments prioritize insufficient data and use neutral support labels',()=>{
 assert.equal(classifySegment({academic:90,engagement:80,skill:80,readiness:90,readinessStatus:'available',coverage:50}),'insufficient_data')
 assert.equal(classifySegment({academic:48,engagement:82,skill:40,readiness:40,readinessStatus:'available',coverage:100}),'high_engagement_academic_support')
 assert.equal(classifySegment({academic:75,engagement:60,skill:65,readiness:45,readinessStatus:'available',coverage:100}),'strong_academics_needs_placement_preparation')
 assert.equal(classifySegment({academic:75,engagement:60,skill:70,readiness:70,readinessStatus:'available',coverage:100}),'strong_academics_and_placement_readiness')
 assert.equal(classifySegment({academic:73,engagement:60,skill:70,readiness:60,readinessStatus:'available',coverage:100,previousAcademic:68,thresholds:{academicStrong:75,readinessLow:55,academicImprovementPoints:4}}),'improving_academics')
})
